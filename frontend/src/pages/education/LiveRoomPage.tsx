import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Users, Layout, Settings, PhoneOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LiveRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || 'ESK19772JMPZON6';

  // Format code with spaces for display (e.g. ESK 1977 2JM Pzo N 6)
  const formatCode = (raw: string) => {
    const uppercase = raw.toUpperCase();
    const parts = [
      uppercase.substring(0, 3),
      uppercase.substring(3, 7),
      uppercase.substring(7, 10),
      uppercase.substring(10, 13),
      uppercase.substring(13, 14),
      uppercase.substring(14)
    ].filter(Boolean);
    return parts.join(' ');
  };

  // State Management
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState('Admin');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('Your devices are working properly');

  // Media Streams refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Clean up stream on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (streamRef.current) stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setDeviceStatus('Your devices are working properly');
    } catch (err) {
      console.warn('Camera access denied or unavailable, using mocked visualizer instead.', err);
      setDeviceStatus('Camera blocked or unavailable - mock display active');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleJoin = async () => {
    setJoined(true);
    if (!isVideoOff) {
      await startCamera();
    }
    toast.success(`Joined room as ${displayName}`);
  };

  const handleToggleVideo = async () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    if (nextState) {
      stopCamera();
    } else {
      if (joined) {
        await startCamera();
      }
    }
    toast.info(nextState ? 'Camera turned off' : 'Camera turned on');
  };

  const handleToggleAudio = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    toast.info(nextState ? 'Microphone muted' : 'Microphone unmuted');
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/education/live-class/room?code=${code}`;
    navigator.clipboard.writeText(joinUrl);
    toast.success('Meeting link copied to clipboard!');
  };

  const handleLeave = () => {
    stopCamera();
    navigate('/education/live-class');
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-white overflow-hidden">
      {/* Left controls sidebar */}
      <div className="w-full lg:w-80 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col justify-between h-auto lg:h-full z-10">
        <div className="space-y-6">
          {/* Header branding */}
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500 rounded-lg text-white font-black text-xs uppercase tracking-wide">
              eS
            </span>
            <span className="font-extrabold text-sm text-slate-100 uppercase tracking-widest">eSkooly Room</span>
          </div>

          {/* Room Name display */}
          <div className="space-y-1 bg-slate-850 p-4 rounded-xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Meeting ID</p>
            <h3 className="text-base font-black text-amber-500 tracking-wider font-mono">
              {formatCode(code)}
            </h3>
          </div>

          {/* Join Form Overlay */}
          {!joined ? (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">Join meeting</h4>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase">Your Display Name</label>
                <select
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs h-10 rounded-xl border border-slate-800 bg-slate-850 px-3 font-semibold text-slate-200 focus:outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student User</option>
                </select>
              </div>

              <button
                onClick={handleJoin}
                className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all text-white font-extrabold text-xs uppercase tracking-wider shadow-sm"
              >
                Join meeting
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase">
                ● Connected
              </span>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                You are currently inside the room as <span className="text-slate-100 font-black">{displayName}</span>. 
                Share the meeting code with your class so they can join the session.
              </p>
            </div>
          )}
        </div>

        {/* Footer controls & indicators */}
        <div className="space-y-4 pt-6 border-t border-slate-800 lg:pt-0 lg:border-t-0">
          {/* Device status */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isVideoOff && isMuted ? 'bg-red-500' : 'bg-green-500'}`}></span>
            {deviceStatus}
          </div>

          {/* Quick Toolbar */}
          <div className="grid grid-cols-6 gap-2 bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <button
              onClick={handleToggleAudio}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleVideo}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center justify-center"
              title="Copy room link"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center justify-center"
              title="Change layout"
            >
              <Layout className="w-4 h-4" />
            </button>

            <button
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center justify-center"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleLeave}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
              title="Leave Room"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right feed display */}
      <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-6 h-full">
        {/* Large camera feed container */}
        <div className="w-full h-full max-w-4xl max-h-[500px] border border-slate-800 bg-slate-900 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl relative group">
          
          {/* Audio meter visualization bar */}
          {!isMuted && joined && (
            <div className="absolute left-6 bottom-6 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-bold tracking-wider z-20 flex items-center gap-1.5 animate-pulse text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Audio Feed Active
            </div>
          )}

          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
              joined && !isVideoOff && streamRef.current ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />

          {/* Fallback avatar mockup */}
          {(isVideoOff || !joined || !streamRef.current) && (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-indigo-650 flex items-center justify-center border-4 border-slate-800 text-slate-200 font-black text-2xl uppercase shadow-md animate-pulse">
                {displayName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h5 className="font-extrabold text-sm text-slate-200">{displayName}</h5>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                  {isVideoOff ? 'Camera Feed Off' : 'Waiting for connection...'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Leave Floating trigger */}
          <button
            onClick={handleLeave}
            className="absolute right-6 top-6 p-3 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-red-500 hover:bg-slate-800/80 transition-all z-20 shadow-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
