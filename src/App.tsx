import { useState, useEffect, useRef } from "react";
import { Galleria } from "primereact/galleria";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

interface CamerasIDS {
  multiimager: string[];
  ptz: string;
}

type CameraClick = { cameraId: string; pos: [number, number] };

const fetchCameras = async (): Promise<CamerasIDS> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    multiimager: ["/1", "/2", "/3", "/4"],
    ptz: "/ptz",
  };
};

function useCalibrationClick(
  apiCall: (single: CameraClick, ptz: CameraClick) => void,
) {
  const [single, setSingle] = useState<CameraClick | null>(null);
  const [ptz, setPTZ] = useState<CameraClick | null>(null);

  const tryUpload = (newSingle?: CameraClick, newPTZ?: CameraClick) => {
    const s = newSingle ?? single;
    const p = newPTZ ?? ptz;

    if (s && p) {
      apiCall(s, p);
      setSingle(null);
      setPTZ(null);
    }
  };

  const handleSingleClick = (cameraId: string) => (x: number, y: number) => {
    const click: CameraClick = { cameraId, pos: [x, y] };
    setSingle(click);
    tryUpload(click, undefined);
  };

  const handlePTZClick = (cameraId: string) => (x: number, y: number) => {
    const click: CameraClick = { cameraId, pos: [x, y] };
    setPTZ(click);
    tryUpload(undefined, click);
  };

  return { single, ptz, handleSingleClick, handlePTZClick };
}

function CameraCard({
  cameraId,
  width = 320,
  height = 240,
}: {
  cameraId: string;
  width?: number;
  height?: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <img
        src={`https://picsum.photos/${width}/${height}?random=${cameraId}`}
        alt={cameraId}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

function SbSView({ children }: { children: React.ReactNode[] }) {
  const [left, right] = children;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {left}
      </div>
      <div style={{ flex: 3, display: "flex", flexDirection: "column" }}>
        {right}
      </div>
    </div>
  );
}

function ClickableView({
  onClick,
  children,
}: {
  onClick: (x: number, y: number) => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clickPos, setClickPos] = useState<[number, number] | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setClickPos([x, y]);
    onClick(x, y);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: "relative",
        cursor: "crosshair",
        width: "100%",
        height: "100%",
      }}
    >
      {children}

      {clickPos && (
        <div
          style={{
            position: "absolute",
            left: clickPos[0] - 5,
            top: clickPos[1] - 5,
            width: 10,
            height: 10,
            background: "red",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

function CControl({
  cameraId,
  children,
}: {
  cameraId: string;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const startPos = useRef<[number, number] | null>(null);
  const lastPos = useRef<[number, number] | null>(null);
  const dragging = useRef(false);

  const sendAsync = async (dx: number, dy: number) => {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const direction = Math.atan2(dy, dx) * (180 / Math.PI);

    await new Promise((r) => setTimeout(r, 200));

    console.log("PTZ MOVE", {
      cameraId,
      dx,
      dy,
      magnitude,
      directionDeg: direction,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;

    const pos: [number, number] = [e.clientX, e.clientY];
    startPos.current = pos;
    lastPos.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;

    lastPos.current = [e.clientX, e.clientY];
  };

  const handleMouseUp = () => {
    if (!dragging.current || !startPos.current || !lastPos.current) return;

    const dx = lastPos.current[0] - startPos.current[0];
    const dy = lastPos.current[1] - startPos.current[1];

    sendAsync(dx, dy);

    dragging.current = false;
    startPos.current = null;
    lastPos.current = null;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ width: "100%", height: "100%", cursor: "grab" }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [cameras, setCameras] = useState<CamerasIDS | null>(null);

  const apiCall = (single: CameraClick, ptz: CameraClick) => {
    console.log("API call with calibration pair:", single, ptz);
  };

  const { single, ptz, handleSingleClick, handlePTZClick } =
    useCalibrationClick(apiCall);

  useEffect(() => {
    fetchCameras().then(setCameras);
  }, []);

  if (!cameras) return <div>Loading cameras...</div>;

  const itemTemplate = (cam: string) => (
    <ClickableView onClick={handleSingleClick(cam)}>
      <CameraCard cameraId={cam} />
    </ClickableView>
  );

  const thumbnailTemplate = (cam: string) => <CameraCard cameraId={cam} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          padding: 24,
          background: "white",
          borderRadius: 8,
          marginTop: 40,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
        }}
      >
        <SbSView>
          <Galleria
            value={cameras.multiimager}
            item={itemTemplate}
            thumbnail={thumbnailTemplate}
            showIndicators={false}
            showItemNavigators={false}
            showThumbnailNavigators={false}
            circular
            numVisible={4}
            style={{ flex: 1 }} // force Galleria to take full height
          />

          <CControl cameraId={cameras.ptz}>
            <ClickableView onClick={handlePTZClick(cameras.ptz)}>
              <CameraCard cameraId={cameras.ptz} width={640} height={200} />
            </ClickableView>
          </CControl>
        </SbSView>
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          {single && (
            <div>
              Selected camera: <strong>{single.cameraId}</strong>
            </div>
          )}

          {ptz && (
            <div>
              PTZ clicked: <strong>{ptz.cameraId}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
