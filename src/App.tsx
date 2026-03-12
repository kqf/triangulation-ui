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

  const singleRef = useRef<CameraClick | null>(null);
  const ptzRef = useRef<CameraClick | null>(null);

  const tryUpload = (newSingle?: CameraClick, newPTZ?: CameraClick) => {
    if (newSingle) singleRef.current = newSingle;
    if (newPTZ) ptzRef.current = newPTZ;

    if (singleRef.current && ptzRef.current) {
      apiCall(singleRef.current, ptzRef.current);
      singleRef.current = null;
      ptzRef.current = null;
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
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

function SbSView({
  children,
}: {
  children: [React.ReactNode, React.ReactNode];
}) {
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

    setTimeout(() => setClickPos(null), 1200);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startPos = useRef<[number, number] | null>(null);
  const currentPos = useRef<[number, number] | null>(null);
  const dragging = useRef(false);

  const drawVector = () => {
    const canvas = canvasRef.current;
    if (!canvas || !startPos.current || !currentPos.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [sx, sy] = startPos.current;
    const [cx, cy] = currentPos.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();

    // draw endpoint
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const sendAsync = async (dx: number, dy: number) => {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const direction = (Math.atan2(dy, dx) * 180) / Math.PI;

    await new Promise((r) => setTimeout(r, 200));

    console.log("PTZ MOVE", {
      cameraId,
      dx,
      dy,
      magnitude,
      directionDeg: direction,
    });
  };

  const getLocalCoords = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top] as [number, number];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    const pos = getLocalCoords(e);

    startPos.current = pos;
    currentPos.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;

    currentPos.current = getLocalCoords(e);
    drawVector();
  };

  const handleMouseUp = () => {
    if (!dragging.current || !startPos.current || !currentPos.current) return;

    const dx = currentPos.current[0] - startPos.current[0];
    const dy = currentPos.current[1] - startPos.current[1];

    sendAsync(dx, dy);

    dragging.current = false;
    startPos.current = null;
    currentPos.current = null;

    clearCanvas();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const syncSize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    syncSize();

    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {children}

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
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

  const thumbnailTemplate = (cam: string) => (
  <div style={{ width: 56, height: 42, overflow: "hidden" , margin: 2}}>
    <CameraCard cameraId={cam} />
  </div>
);

  <style>{`
  .p-galleria,
  .p-galleria .p-galleria-content,
  .p-galleria-item-wrapper,
  .p-galleria-item-container,
  .p-galleria-item,
  .p-galleria-thumbnail-wrapper,
  .p-galleria-thumbnail-container {
    background: transparent !important;
  }
  .p-galleria-thumbnail-item {
    padding: 2px !important;
  }
`}</style>;

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
