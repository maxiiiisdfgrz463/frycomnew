import React, { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaDisplayProps {
  type?: "image" | "video";
  src?: string;
  alt?: string;
  aspectRatio?: number;
  className?: string;
}

const MediaDisplay = ({
  type = "image",
  src = type === "image"
    ? "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"
    : "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
  alt = "Media content",
  aspectRatio = 16 / 9,
  className,
}: MediaDisplayProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control the video element
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // In a real implementation, this would control the video element
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md bg-slate-100",
        className,
      )}
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            <AspectRatio
              ratio={aspectRatio}
              className="bg-slate-200 overflow-hidden"
            >
              {type === "image" ? (
                <img
                  src={src}
                  alt={alt}
                  className="h-full w-full object-cover transition-all hover:scale-105"
                />
              ) : (
                <div className="relative h-full w-full">
                  <video
                    src={src}
                    className="h-full w-full object-cover"
                    loop
                    playsInline
                    muted={isMuted}
                    autoPlay={isPlaying}
                    controls={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlaying(!isPlaying);
                      const videoElement = e.target as HTMLVideoElement;
                      if (isPlaying) {
                        videoElement.pause();
                      } else {
                        videoElement.play();
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/50 p-2 text-white">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause();
                      }}
                      className="rounded-full bg-white/20 p-1 hover:bg-white/30"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMuteToggle();
                      }}
                      className="rounded-full bg-white/20 p-1 hover:bg-white/30"
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button className="rounded-full bg-white/20 p-1 hover:bg-white/30">
                      <Maximize size={16} />
                    </button>
                  </div>
                </div>
              )}
            </AspectRatio>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-0 bg-black">
          {type === "image" ? (
            <img src={src} alt={alt} className="w-full h-auto" />
          ) : (
            <div className="relative w-full">
              <video
                src={src}
                className="w-full h-auto"
                controls
                autoPlay
                loop
                playsInline
                muted={isMuted}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaDisplay;
