import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_COURSES } from '../constants';
import { CheckCircle, Circle, Play, Pause, Settings, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Edit3, Film } from 'lucide-react';

export const Learn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const course = MOCK_COURSES.find(c => c.id === id);
  const [activeChapterId, setActiveChapterId] = useState(course?.chapters[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState('1080p');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChapterIndex = course?.chapters.findIndex(c => c.id === activeChapterId) ?? 0;
  const progressPercent = course ? (course.chapters.filter(c => c.isCompleted).length / course.chapters.length) * 100 : 0;

  // Module 5: Prevent Right Click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Module 3: Progress Save Logic (Debounced 30s)
  useEffect(() => {
    const saveProgress = () => {
      if (!videoRef.current) return;
      const timestamp = Math.floor(videoRef.current.currentTime);
      console.log(`[Server Mock] Saving progress for user_123, video_${activeChapterId}: ${timestamp}s`);
    };

    const interval = setInterval(() => {
      if (isPlaying) saveProgress();
    }, 30000);

    return () => clearInterval(interval);
  }, [isPlaying, activeChapterId]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          videoRef.current?.parentElement?.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  };

  const handleQualityChange = (newQuality: string) => {
    const currentT = videoRef.current ? videoRef.current.currentTime : 0;
    const wasPlaying = !videoRef.current?.paused;
    setQuality(newQuality);
    
    // Simulating quality switch by reloading source
    if (videoRef.current) {
        videoRef.current.src = `https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4?quality=${newQuality}`;
        videoRef.current.currentTime = currentT;
        if(wasPlaying) videoRef.current.play();
    }
  };

  // Previous / Next Chapter Logic
  const handlePrev = () => {
      if (!course) return;
      if (activeChapterIndex > 0) {
          setActiveChapterId(course.chapters[activeChapterIndex - 1].id);
          setIsPlaying(false);
      }
  };

  const handleNext = () => {
      if (!course) return;
      if (activeChapterIndex < course.chapters.length - 1) {
          setActiveChapterId(course.chapters[activeChapterIndex + 1].id);
          setIsPlaying(false);
      }
  };

  const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }

  if (!course) return null;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-black">
      
      {/* Main Video Player Area */}
      <div className="flex-grow flex flex-col h-full overflow-y-auto relative">
        <div 
            className="relative w-full aspect-video bg-black group flex-shrink-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                className="w-full h-full"
                src={`https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4?quality=${quality}`}
                controls={false}
                onTimeUpdate={handleTimeUpdate}
                onClick={handlePlayPause}
                onEnded={() => setIsPlaying(false)}
            />
            
            {/* Custom Controls Overlay */}
            <div 
                className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Seek Bar */}
                <div className="mb-4 relative group/seek">
                    <div className="h-1 w-full bg-gray-600 rounded-lg overflow-hidden">
                        <div className="h-full bg-brand-500" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrev} className="hover:text-brand-500 transition disabled:opacity-50" disabled={activeChapterIndex === 0}>
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                        
                        <button onClick={handlePlayPause} className="hover:text-brand-500 transition">
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                         <button onClick={handleNext} className="hover:text-brand-500 transition disabled:opacity-50" disabled={activeChapterIndex === course.chapters.length - 1}>
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                        
                        <div className="flex items-center gap-2 group/vol pl-4 border-l border-gray-700 ml-4">
                            <button onClick={toggleMute}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                                <input 
                                    type="range" min="0" max="1" step="0.1" 
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setVolume(v);
                                        if(videoRef.current) videoRef.current.volume = v;
                                        setIsMuted(v === 0);
                                    }}
                                    className="w-20 h-1 accent-white"
                                />
                            </div>
                        </div>

                        <span className="text-xs font-mono text-gray-300">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative group/quality">
                            <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded text-xs font-bold text-gray-300 border border-gray-700">
                                {quality} <Settings size={12} />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-lg p-1 hidden group-hover/quality:block w-24 shadow-xl z-20">
                                {['1080p', '720p', '480p', '360p'].map(q => (
                                    <button 
                                        key={q} 
                                        onClick={() => handleQualityChange(q)}
                                        className={`block w-full text-left px-3 py-1.5 text-xs rounded transition ${quality === q ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={toggleFullScreen}>
                             <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {!isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="bg-white/10 p-6 rounded-full backdrop-blur-sm border border-white/20 shadow-2xl animate-pulse-slow">
                         <Play size={48} fill="white" className="ml-2 text-white" />
                     </div>
                 </div>
            )}
        </div>

        {/* Course Progress Bar (Global) */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-4">
             <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                 <span className="flex items-center gap-2"><Film size={14}/> {course.title}</span>
                 <span>{Math.round(progressPercent)}% Completed</span>
             </div>
             <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                 <div 
                    className="bg-gradient-to-r from-brand-600 to-purple-500 h-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                 />
             </div>
        </div>

        {/* Mobile Notes Area */}
        <div className="lg:hidden p-4 bg-neutral-950 flex-grow">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-white text-sm"><Edit3 size={16}/> Personal Notes</h3>
            <textarea 
                className="w-full h-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                placeholder="Type your notes for this chapter here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            ></textarea>
        </div>
      </div>

      {/* Curriculum Sidebar */}
      <div className="w-full lg:w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full z-10">
         <div className="p-4 border-b border-neutral-800 bg-neutral-900">
            <h2 className="font-bold text-lg text-white">Course Content</h2>
            <p className="text-xs text-gray-500 mt-1">{course.chapters.length} Modules • Total Duration: 4h 30m</p>
         </div>
         
         <div className="flex-grow overflow-y-auto custom-scrollbar">
            {course.chapters.map((chapter, idx) => (
                <button
                    key={chapter.id}
                    onClick={() => setActiveChapterId(chapter.id)}
                    className={`w-full text-left p-4 border-b border-neutral-800 hover:bg-white/5 transition flex items-start gap-3 group ${
                        activeChapterId === chapter.id ? 'bg-brand-900/20 border-l-4 border-l-brand-600' : 'border-l-4 border-l-transparent'
                    }`}
                >
                    <div className="mt-0.5">
                        {chapter.isCompleted ? <CheckCircle size={16} fill="currentColor" className="text-brand-500" /> : <Circle size={16} className="text-neutral-600 group-hover:text-neutral-500" />}
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 block">Module 0{idx + 1}</span>
                        <h3 className={`text-sm font-medium leading-tight ${activeChapterId === chapter.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                            {chapter.title}
                        </h3>
                        <p className="text-xs text-neutral-600 mt-1.5 font-mono">{chapter.duration}</p>
                    </div>
                </button>
            ))}
         </div>

         {/* Desktop Notes Area */}
         <div className="hidden lg:flex flex-col p-4 border-t border-neutral-800 bg-neutral-900 h-1/3">
            <h3 className="font-bold text-sm mb-2 text-neutral-400 flex items-center gap-2"><Edit3 size={14}/> Personal Notes</h3>
            <textarea 
                className="flex-grow w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-gray-300 resize-none focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                placeholder="Take notes for this module..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            ></textarea>
         </div>
      </div>
    </div>
  );
};