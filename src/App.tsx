import { useState, useEffect, useRef } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

interface CamerasIDS {
  multiimager: string[];
  ptz: string;
}

type CameraClick = { cameraId: string; pos: [number, number] };

// Fake backend fetch
const fetchCameras = async (): Promise<CamerasIDS> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    multiimager: ["/1", "/2", "/3", "/4"],
    ptz: "/ptz",
  };
};

// Hook for calibration clicks
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
      // Reset after upload
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

// Camera card
function CameraCard({
  cameraId,
  onClick,
  width = 320,
  height = 240,
}: {
  cameraId: string;
  onClick?: (cameraId: string) => void;
  width?: number;
  height?: number;
}) {
  return (
    <div onClick={() => onClick?.(cameraId)} style={{ width: "100%" }}>
      <div style={{ fontWeight: "bold" }}>{cameraId.toUpperCase()}</div>
      <img
        src={`https://picsum.photos/${width}/${height}?random=${cameraId}`}
        alt={cameraId}
        style={{ width: "100%", display: "block" }} // Added these styles
      />
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
        // display: "inline-block",
        cursor: "crosshair",
        display: "block", // Changed from inline-block to block
        width: "100%", // Force it to fill the flex: 1 container
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

// Main App
export default function App() {
  const [cameras, setCameras] = useState<CamerasIDS | null>(null);

  // API stub
  const apiCall = (single: CameraClick, ptz: CameraClick) => {
    console.log("API call with calibration pair:", single, ptz);
  };

  const { single, ptz, handleSingleClick, handlePTZClick } =
    useCalibrationClick(apiCall);

  useEffect(() => {
    fetchCameras().then(setCameras);
  }, []);

  if (!cameras) return <div>Loading cameras...</div>;

  const customRenderThumbs = () => {
    return cameras.multiimager.map((cam) => (
      <div key={`thumb-${cam}`} style={{ cursor: "pointer" }}>
        <img
          src={`https://picsum.photos/320/240?random=${cam}`}
          alt={`Thumbnail ${cam}`}
          style={{ width: "100%", height: "auto", borderRadius: "4px" }}
        />
      </div>
    ));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "stretch", // ← key: both children stretch to same height
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          padding: "24px",
          boxSizing: "border-box",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginTop: "40px", // Added margin top to replace the flex centering
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Calibration Carousel
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start", // 1. Align to top so images stay level
            gap: 0, // 2. Remove gap for "no gaps" look
            width: "100%",
          }}
        >
          {/* Wrapper for Carousel to control width */}
          <div style={{ flex: 1 }}>
            <Carousel
              showThumbs={true}
              renderThumbs={customRenderThumbs}
              showIndicators={false}
              infiniteLoop
              transitionTime={0}
              swipeable={false}
              stopOnHover={false}
              showStatus={false} // Removed status for a cleaner look
            >
              {cameras.multiimager.map((cam) => (
                <div key={cam} style={{ textAlign: "center", width: "100%" }}>
                  <ClickableView onClick={handleSingleClick(cam)}>
                    <CameraCard cameraId={cam} />
                  </ClickableView>
                </div>
              ))}
            </Carousel>
          </div>

          {/* Wrapper for PTZ to match Carousel width */}
          <div style={{ flex: 1, textAlign: "center", width: "100%" }}>
            <ClickableView onClick={handlePTZClick(cameras.ptz)}>
              <CameraCard cameraId={cameras.ptz} width={640} height={200}/>
            </ClickableView>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
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
