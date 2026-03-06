import { useState, useEffect, useRef } from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

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
        onLoad={(e) => {
          const img = e.currentTarget;
          onAspectRatioLoad?.(img.naturalWidth / img.naturalHeight);
        }}
        style={{
          width: "100%",
          display: "block",
          height: forcedImageHeight ? `${forcedImageHeight}px` : "auto",
          objectFit: "cover",
        }}
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
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  const [cameras, setCameras] = useState<CamerasIDS | null>(null);
  const ptzImageRef = useRef<HTMLImageElement>(null);
  const [ptzImageHeight, setPtzImageHeight] = useState<number | null>(null);
  const [leftAspectRatio, setLeftAspectRatio] = useState<number | null>(null);

  const { single, ptz, handleSingleClick, handlePTZClick } =
    useCalibrationClick((s, p) => console.log("API call:", s, p));

  useEffect(() => {
    fetchCameras().then(setCameras);
  }, []);

  // Observe PTZ image height — this is the source of truth for height
  useEffect(() => {
    if (!ptzImageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setPtzImageHeight(entries[0].contentRect.height);
    });
    observer.observe(ptzImageRef.current);
    return () => observer.disconnect();
  }, [cameras]);

  // Left panel width is derived from PTZ height + left image aspect ratio
  const leftPanelWidth =
    ptzImageHeight && leftAspectRatio
      ? Math.round(ptzImageHeight * leftAspectRatio)
      : "auto";

  if (!cameras) return <div>Loading cameras...</div>;

  const customRenderThumbs = () =>
    cameras.multiimager.map((cam) => (
      <div key={`thumb-${cam}`} style={{ cursor: "pointer" }}>
        <img
          src={`https://picsum.photos/100/75?random=${cam}`}
          alt={`Thumbnail ${cam}`}
          style={{ width: "100%", height: "auto", borderRadius: "4px" }}
        />
      </div>
    ));

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "stretch", // ← key: both children stretch to same height
        justifyContent: "center",
        background: "#f5f5f5",
        display: "flex", // Add this
        alignItems: "center", // Vertical center
        justifyContent: "center", // Horizontal center
      }}
    >
      <div
        style={{
          width: "auto",
          maxWidth: "95vw",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginTop: "40px", // Added margin top to replace the flex centering
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
          Calibration Studio
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
          {/* Left: Carousel — width derived from PTZ height + own aspect ratio */}
          <div style={{ width: leftPanelWidth, flexShrink: 0, minWidth: 0 }}>
            <Carousel
              showThumbs={true}
              renderThumbs={customRenderThumbs}
              showIndicators={false}
              infiniteLoop
              transitionTime={300}
              showStatus={false}
            >
              {cameras.multiimager.map((cam) => (
                <div key={cam} style={{ textAlign: "center", width: "100%" }}>
                  <ClickableView onClick={handleSingleClick(cam)}>
                    <CameraCard
                      cameraId={cam}
                      forcedImageHeight={ptzImageHeight}
                      // Only capture aspect ratio from the first image
                      onAspectRatioLoad={
                        i === 0 ? setLeftAspectRatio : undefined
                      }
                    />
                  </ClickableView>
                </div>
              ))}
            </Carousel>
          </div>

          {/* Right: PTZ — fills remaining space, dictates height */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ClickableView onClick={handlePTZClick(cameras.ptz)}>
              <CameraCard cameraId={cameras.ptz} width={640} height={200}/>
            </ClickableView>
          </div>
        </div>

        <div
          style={{
            marginTop: "30px",
            borderTop: "1px solid #eee",
            paddingTop: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "inline-flex", gap: "40px" }}>
            <p>
              Left Selection: <b>{single?.cameraId || "None"}</b>
            </p>
            <p>
              Right Selection: <b>{ptz?.cameraId || "None"}</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
