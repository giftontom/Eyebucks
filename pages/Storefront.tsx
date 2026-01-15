import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Star, ArrowRight, Youtube, Instagram, MonitorPlay, Film, Camera, Users, CheckCircle2, Download, MessageCircle, Layers, FileText, X, Plus, Award, Zap, TrendingUp, Globe, Smartphone, Clapperboard, Sparkles } from 'lucide-react';
import { MOCK_COURSES } from '../constants';
import { CourseType } from '../types';
import { useAuth } from '../context/AuthContext';

// --- Local Data for Static Sections ---

const FAQS = [
  {
    q: "Do I need expensive gear to start?",
    a: "Absolutely not. We have dedicated modules for smartphone filmmaking and budget DSLRs. The principles of lighting and composition apply regardless of the camera."
  },
  {
    q: "Is this suitable for complete beginners?",
    a: "Yes. Our 'Zero to Hero' bundles start with the absolute basics of ISO, Shutter Speed, and Aperture before moving into advanced color grading."
  },
  {
    q: "Do I get access to the raw footage?",
    a: "Yes! All editing courses come with 100GB+ of 6K RAW footage so you can practice grading professional clips, not just your own backyard footage."
  },
  {
    q: "How does the community feedback work?",
    a: "You upload your work to our private Discord. Verified pro instructors review your edits/stills weekly and provide video feedback."
  }
];

const TESTIMONIALS = [
  {
    name: "Marcus Chen",
    role: "Freelance Director",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200",
    text: "I was stuck charging ₹15k per video. After the 'Business of Filmmaking' module, I landed my first ₹1.5L commercial client. The contract templates alone are worth the price."
  },
  {
    name: "Sarah Williams",
    role: "Content Creator",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    text: "YouTube tutorials are fragmented. Eyebuckz gave me a roadmap. I stopped guessing if my lighting was right—now I know it is."
  },
  {
    name: "David Okonjo",
    role: "Colorist",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    text: "The DaVinci Resolve masterclass is insane. The node structures provided have saved me hours on every project."
  }
];

const STUDENT_SHOWCASE = [
  { title: "Neon Nights", author: "Alex K.", image: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800", type: "Color Grading" },
  { title: "Urban Explorer", author: "Sarah J.", image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=800", type: "Cinematography" },
  { title: "Mountain Peak", author: "Mike R.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800", type: "VFX" },
  { title: "Life", author: "Emily W.", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800", type: "Editing" },
];

// --- Animation Helper Component ---
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-out transform ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export const Storefront: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | CourseType>('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 3D Tilt Logic for Editor Workspace
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -8; // Max 8 deg tilt
      const rotateY = ((x - centerX) / centerX) * 8;

      setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
      setRotate({ x: 0, y: 0 });
  };

  const filteredCourses = filterType === 'ALL' 
    ? MOCK_COURSES 
    : MOCK_COURSES.filter(c => c.type === filterType);

  return (
    <div className="bg-white font-sans text-neutral-900 overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-[90vh] min-h-[700px] flex items-center justify-center overflow-hidden bg-black">
        {/* Video Background with Poster Fallback */}
        <div className="absolute inset-0 z-0">
            <video 
                src="https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4" 
                poster="https://images.unsplash.com/photo-1478720568477-152d9b164e63?auto=format&fit=crop&q=80&w=1920"
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover opacity-50 scale-105"
            />
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80"></div>
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        </div>

        <div className="relative z-10 container max-w-6xl mx-auto px-4 text-center mt-12">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl text-white text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in-up shadow-2xl hover:bg-white/10 hover:scale-105 transition duration-300 cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                New Cohort Starting Soon
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-8 leading-[0.95] animate-fade-in-up delay-100 drop-shadow-2xl">
                FILM LIKE <br/>
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500">
                   A MASTER.
                </span>
            </h1>

            <p className="text-lg md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto animate-fade-in-up delay-200 font-medium text-shadow-lg">
                Stop guessing. Start executing. The only filmmaking platform that gives you the <span className="text-white font-bold hover:text-brand-500 transition-colors cursor-default">raw assets</span>, <span className="text-white font-bold hover:text-brand-500 transition-colors cursor-default">community</span>, and <span className="text-white font-bold hover:text-brand-500 transition-colors cursor-default">blueprints</span> to go full-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-300">
                <button
                    onClick={() => {
                      if (user) {
                        navigate('/dashboard');
                      } else {
                        document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="group relative w-full sm:w-auto h-16 px-12 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.7)] hover:scale-105 overflow-hidden"
                >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    {user ? 'Go to Dashboard' : 'Start Learning Now'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                </button>
                <a 
                    href="https://youtube.com/@eyebuckz" 
                    target="_blank"
                    rel="noreferrer"
                    className="group w-full sm:w-auto h-16 px-12 rounded-full bg-white/5 border border-white/20 hover:bg-white text-white hover:text-black font-bold text-lg flex items-center justify-center gap-3 transition-all backdrop-blur-sm hover:scale-105"
                >
                    <Play size={20} fill="currentColor" /> Watch Trailer
                </a>
            </div>
        </div>
      </section>

      {/* --- SOCIAL PROOF TICKER --- */}
      <section className="bg-black border-b border-white/10 overflow-hidden py-6 relative z-20">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10"></div>
        <div className="flex w-full whitespace-nowrap overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-300">
             <div className="flex animate-marquee items-center gap-16 min-w-full px-4 text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
                {[...Array(6)].map((_, i) => (
                    <React.Fragment key={i}>
                        <span className="flex items-center gap-3 hover:text-white transition-colors"><Users size={18} className="text-brand-600"/> 10,000+ Students</span>
                        <span className="text-neutral-700">/</span>
                        <span className="flex items-center gap-3 hover:text-white transition-colors"><Star size={18} className="text-yellow-500 fill-yellow-500"/> 4.9/5 Rating</span>
                        <span className="text-neutral-700">/</span>
                        <span className="flex items-center gap-3 hover:text-white transition-colors"><Globe size={18} className="text-blue-500"/> 50+ Countries</span>
                        <span className="text-neutral-700">/</span>
                    </React.Fragment>
                ))}
            </div>
        </div>
      </section>

      {/* --- STUDENT SHOWCASE --- */}
      <section className="py-24 bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Made by Students</h2>
                        <p className="text-neutral-400 max-w-xl text-lg">Real results from real people. Our students are winning film festivals, landing commercial clients, and growing their channels.</p>
                    </div>
                    <button className="hidden md:flex items-center gap-2 text-white font-bold hover:text-brand-500 transition group">
                        View Gallery <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            </FadeIn>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STUDENT_SHOWCASE.map((item, idx) => (
                    <FadeIn key={idx} delay={idx * 100}>
                        <div className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 cursor-pointer border border-white/5 hover:border-brand-500/50 transition-colors duration-300">
                            <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-100"></div>
                            
                            <div className="absolute bottom-6 left-6 transform transition-transform duration-300 group-hover:-translate-y-2">
                                <span className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-2 block">{item.type}</span>
                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-brand-400 transition-colors">{item.title}</h3>
                                <p className="text-sm text-gray-400">by {item.author}</p>
                            </div>
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 border border-white/20 group-hover:rotate-180">
                                <Play size={24} fill="white" className="ml-1 text-white transform group-hover:-rotate-180 transition-transform duration-500"/>
                            </div>
                        </div>
                    </FadeIn>
                ))}
            </div>
        </div>
      </section>

      {/* --- PROBLEM VS SOLUTION --- */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center">
                <FadeIn className="order-2 md:order-1">
                    <span className="inline-block px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-bold tracking-wider uppercase text-xs mb-4">The Reality</span>
                    <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6 leading-tight">Stop piecing it together from random tutorials.</h2>
                    <p className="text-lg text-neutral-500 leading-relaxed mb-8">
                        The problem with "YouTube University" is context. You learn <i>how</i> to do a whip pan, but not <i>why</i> it serves the story. This creates gaps in your knowledge that hold you back from pro-level work.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="group flex gap-4 p-4 rounded-xl bg-red-50 border border-red-100 opacity-70 hover:opacity-100 transition duration-300 hover:shadow-md cursor-default">
                            <div className="bg-red-100 p-2 rounded-lg h-fit group-hover:scale-110 transition-transform">
                                <X className="text-red-500 shrink-0" size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-900">The "Old Way"</h4>
                                <p className="text-sm text-red-700/80 mt-1">Disorganized advice, no feedback loops, using bad footage, no career roadmap.</p>
                            </div>
                        </div>
                        <div className="group flex gap-4 p-5 rounded-xl bg-green-50 border border-green-100 shadow-lg transform hover:-translate-y-1 transition duration-300 border-l-4 border-l-green-500 cursor-default">
                            <div className="bg-green-100 p-2 rounded-lg h-fit group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="text-green-600 shrink-0" size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-green-900 text-lg">The Eyebuckz Method</h4>
                                <p className="text-sm text-green-800/80 mt-1">Structured curriculum, industry-standard raw assets, direct mentor feedback, business templates.</p>
                            </div>
                        </div>
                    </div>
                </FadeIn>
                
                <FadeIn delay={200} className="relative order-1 md:order-2 perspective-1000">
                    {/* Decorative Elements */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-100 rounded-full blur-[100px] opacity-50 animate-pulse-slow"></div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-100 rounded-full blur-[80px] opacity-50"></div>
                    
                    {/* Interactive 3D Card */}
                    <div 
                        ref={workspaceRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{ 
                            transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
                            transition: 'transform 0.1s ease-out'
                        }}
                        className="relative bg-neutral-900 rounded-3xl p-3 shadow-2xl hover:shadow-brand-500/20 z-10 cursor-pointer group"
                    >
                         <div className="relative overflow-hidden rounded-2xl">
                             <img 
                                src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1000" 
                                alt="Editor Workspace" 
                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                            />
                            {/* Gloss effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"></div>
                         </div>
                         
                        <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex items-center gap-4 max-w-xs transform transition-transform duration-300 hover:scale-105 hover:rotate-2">
                            <div className="bg-green-100 p-3 rounded-full text-green-600">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-neutral-900">Career Fast-Track</p>
                                <p className="text-xs text-neutral-500">Save 3+ years of trial and error.</p>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </div>
      </section>

      {/* --- ECOSYSTEM (BENTO GRID) --- */}
      <section className="py-24 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-brand-600 font-bold tracking-wider uppercase text-sm">The Ecosystem</span>
                    <h2 className="text-4xl font-bold text-neutral-900 mt-2 mb-6">More Than Just Videos.</h2>
                    <p className="text-neutral-500 text-lg">We provide the actual tools you need to execute the job.</p>
                </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[320px]">
                {/* Card 1: Assets */}
                <FadeIn className="md:col-span-2">
                    <div className="h-full bg-white rounded-3xl p-10 border border-neutral-200 relative overflow-hidden group hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-brand-500/30 transition-all duration-300 cursor-default">
                        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
                            <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <Download size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-neutral-900 mb-2">100GB+ Raw Assets</h3>
                                <p className="text-neutral-500 text-lg">Practice with 6K RED and Arri Alexa footage. Don't wait for a shoot to practice grading.</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white via-white/80 to-transparent z-0"></div>
                        <img src="https://images.unsplash.com/photo-1526666923127-b2970f64b422?auto=format&fit=crop&q=80&w=1000" className="absolute top-0 right-0 h-full w-2/3 object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-500 -z-10 grayscale group-hover:grayscale-0" alt="Assets" />
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-500/10 rounded-3xl transition-colors pointer-events-none"></div>
                    </div>
                </FadeIn>

                {/* Card 2: Community */}
                <FadeIn delay={100} className="md:col-span-2">
                    <div className="h-full bg-neutral-900 text-white rounded-3xl p-10 border border-neutral-800 relative overflow-hidden group hover:shadow-[0_20px_40px_-15px_rgba(220,38,38,0.3)] transition-all duration-300 cursor-default">
                        <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-white mb-4 border border-white/10 group-hover:rotate-12 transition-transform duration-300">
                                <MessageCircle size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold mb-2">Private Discord</h3>
                                <p className="text-neutral-400 text-lg">Get feedback on your cuts. Network with other editors. Find gigs.</p>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500"></div>
                        <div className="absolute right-0 bottom-0 p-10 opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500">
                            <Users size={120} />
                        </div>
                    </div>
                </FadeIn>

                {/* Card 3: Documents */}
                <FadeIn delay={200} className="md:col-span-1">
                    <div className="h-full bg-white rounded-3xl p-8 border border-neutral-200 flex flex-col justify-between hover:border-brand-500 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group shadow-sm cursor-default">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-neutral-900">Contracts</h3>
                            <p className="text-sm text-neutral-500 mt-2">Freelance agreements & model releases included.</p>
                        </div>
                    </div>
                </FadeIn>

                {/* Card 4: Presets */}
                <FadeIn delay={300} className="md:col-span-1">
                    <div className="h-full bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg hover:shadow-brand-500/40 hover:-translate-y-2 transition-all duration-300 cursor-default">
                        <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">50+ LUTs</h3>
                            <p className="text-sm text-brand-100 mt-2">Professional color grading presets included.</p>
                        </div>
                    </div>
                </FadeIn>

                {/* Card 5: Certificate */}
                <FadeIn delay={400} className="md:col-span-2">
                    <div className="h-full bg-white rounded-3xl p-8 border border-neutral-200 flex items-center gap-8 hover:shadow-xl transition-all duration-300 group cursor-default">
                        <div className="flex-grow z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Award size={32} className="text-yellow-500" />
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">Accredited</span>
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-900 group-hover:text-brand-600 transition-colors">Industry Certification</h3>
                            <p className="text-neutral-500 mt-2">Earn a verifiable certificate for LinkedIn upon completion. Prove your skills to clients.</p>
                        </div>
                        <div className="hidden sm:block w-32 h-24 bg-neutral-50 border border-neutral-200 rounded-lg transform rotate-6 shadow-md relative overflow-hidden group-hover:rotate-0 group-hover:scale-110 transition-all duration-500">
                            <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-brand-600 opacity-20"></div>
                            <div className="absolute bottom-2 right-2 w-16 h-2 bg-neutral-200 rounded"></div>
                            <div className="absolute bottom-6 right-2 w-10 h-2 bg-neutral-200 rounded"></div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </div>
      </section>

      {/* --- COURSES GRID --- */}
      <section id="courses" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-4xl font-bold text-neutral-900 mb-2">Masterclass Catalog</h2>
                        <p className="text-neutral-500 text-lg">Choose your path. From cinematography to color grading.</p>
                    </div>
                    {/* Filters */}
                    <div className="flex bg-neutral-100 p-1.5 rounded-xl border border-neutral-200">
                        {['ALL', 'BUNDLE', 'MODULE'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                    filterType === type 
                                    ? 'bg-white text-neutral-900 shadow-md transform scale-105' 
                                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                                }`}
                            >
                                {type === 'ALL' ? 'All' : type === 'BUNDLE' ? 'Bundles' : 'Modules'}
                            </button>
                        ))}
                    </div>
                </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course, index) => {
                     const isBundle = course.type === CourseType.BUNDLE;
                     return (
                        <FadeIn key={course.id} delay={index * 50} className={`${isBundle ? 'lg:col-span-2' : ''}`}>
                            <div 
                                className={`group flex flex-col bg-white rounded-3xl overflow-hidden border border-neutral-200 hover:border-brand-500/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 h-full`}
                            >
                                {/* Card Header / Image */}
                                <Link to={`/course/${course.id}`} className={`relative overflow-hidden bg-neutral-900 block ${isBundle ? 'aspect-[2.2/1]' : 'aspect-[4/3]'}`}>
                                    <img 
                                        src={course.thumbnail} 
                                        alt={course.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                    
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <span className="bg-white/95 backdrop-blur-md text-neutral-900 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                                            {course.type}
                                        </span>
                                        {isBundle && <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide animate-pulse shadow-lg shadow-brand-500/40">Best Value</span>}
                                    </div>
                                    {/* Hover Play Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <div className="group-hover:scale-110 transition-transform duration-300 flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-md">
                                                <Play size={32} fill="white" className="ml-1 text-white" />
                                            </div>
                                            <span className="text-white font-bold tracking-widest text-sm uppercase">Preview Course</span>
                                        </div>
                                    </div>
                                </Link>
                                
                                {/* Card Content */}
                                <div className="p-8 flex flex-col flex-grow relative">
                                    <div className="flex items-center gap-3 mb-4 text-xs font-bold text-neutral-500">
                                        <div className="flex text-yellow-500 bg-yellow-50 px-2 py-1 rounded-md">
                                            <Star size={12} fill="currentColor" className="mr-1"/>
                                            <span>{course.rating || '4.8'}</span>
                                        </div>
                                        <span className="flex items-center gap-1"><Users size={12}/> {(course.totalStudents || 120) * 12} Students</span>
                                        <span className="flex items-center gap-1"><Clapperboard size={12}/> {course.chapters.length} Lessons</span>
                                    </div>
                                    <Link to={`/course/${course.id}`} className="block">
                                        <h3 className="text-2xl font-bold text-neutral-900 mb-3 group-hover:text-brand-600 transition-colors leading-tight">
                                            {course.title}
                                        </h3>
                                        <p className="text-neutral-500 mb-8 line-clamp-2 text-sm leading-relaxed">{course.description}</p>
                                    </Link>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-neutral-100">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-neutral-400 line-through font-medium">₹{(course.price * 1.5).toLocaleString()}</span>
                                            <div className="text-2xl font-bold text-neutral-900">₹{course.price.toLocaleString()}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                navigate(`/checkout/${course.id}`);
                                            }}
                                            className="relative overflow-hidden bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-neutral-900/20 hover:-translate-y-1 group/btn"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">Buy Now <ArrowRight size={16}/></span>
                                            <div className="absolute inset-0 bg-brand-600 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform origin-left duration-300"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                     );
                })}
            </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="py-24 bg-neutral-950 text-white overflow-hidden border-t border-white/10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Don't just take our word for it.</h2>
                    <p className="text-neutral-400 text-lg">Join a community of serious filmmakers.</p>
                </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {TESTIMONIALS.map((t, i) => (
                    <FadeIn key={i} delay={i * 100}>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:bg-white/10 transition duration-300 hover:scale-105 h-full">
                            <div className="flex gap-1 text-yellow-500 mb-6">
                                {[...Array(5)].map((_, idx) => <Star key={idx} size={18} fill="currentColor"/>)}
                            </div>
                            <p className="text-neutral-300 mb-8 leading-relaxed text-lg">"{t.text}"</p>
                            <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                                <img src={t.image} className="w-12 h-12 rounded-full border-2 border-brand-600 object-cover" alt={t.name} />
                                <div>
                                    <h4 className="font-bold text-white">{t.name}</h4>
                                    <p className="text-xs text-neutral-500 uppercase tracking-wide font-bold">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                ))}
            </div>
         </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
                <h2 className="text-3xl font-bold text-neutral-900 mb-12 text-center">Frequently Asked Questions</h2>
            </FadeIn>
            <div className="space-y-4">
                {FAQS.map((faq, idx) => (
                    <FadeIn key={idx} delay={idx * 50}>
                        <div className="border border-neutral-200 rounded-2xl overflow-hidden transition-all duration-300 hover:border-neutral-300 hover:shadow-md group">
                            <button 
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-6 bg-white hover:bg-neutral-50 transition text-left"
                            >
                                <span className="font-bold text-neutral-900 text-lg group-hover:text-brand-600 transition-colors">{faq.q}</span>
                                {openFaq === idx ? <X size={24} className="text-neutral-400"/> : <Plus size={24} className="text-neutral-400"/>}
                            </button>
                            {openFaq === idx && (
                                <div className="p-6 pt-0 bg-neutral-50 border-t border-neutral-200 text-neutral-600 leading-relaxed text-lg animate-slide-in">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    </FadeIn>
                ))}
            </div>
        </div>
      </section>

      {/* --- MENTOR SECTION --- */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="lg:w-1/2">
                    <FadeIn className="relative aspect-[4/5] rounded-3xl overflow-hidden max-w-sm mx-auto lg:ml-0 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 border-4 border-white/10 group">
                         <img 
                            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800" 
                            alt="Mentor" 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                         <div className="absolute bottom-8 left-8">
                             <h3 className="text-4xl font-black text-white">Eyebuckz</h3>
                             <p className="text-brand-500 font-bold uppercase tracking-wider text-sm mt-2">Founder & Lead Instructor</p>
                         </div>
                         <div className="absolute top-4 right-4 bg-white/20 backdrop-blur rounded-full p-2 animate-bounce">
                             <Sparkles className="text-yellow-400" size={24} />
                         </div>
                    </FadeIn>
                </div>
                <div className="lg:w-1/2">
                    <FadeIn delay={200}>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Learn from Real Experience.</h2>
                        <p className="text-lg text-neutral-400 mb-8 leading-relaxed">
                            I've spent the last 10 years shooting for brands like <span className="text-white font-bold">Nike</span>, <span className="text-white font-bold">Sony</span>, and <span className="text-white font-bold">Red Bull</span>. I built Eyebuckz because I was tired of gatekeeping in the industry. I'm giving you the exact blueprints I use to pitch, shoot, and edit 6-figure projects.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white/10 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 border border-white/10 hover:bg-white/20 transition cursor-default">
                            <Youtube size={18} className="text-red-500"/> 45K+ Subscribers
                            </div>
                            <div className="bg-white/10 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 border border-white/10 hover:bg-white/20 transition cursor-default">
                            <CheckCircle2 size={18} className="text-green-500"/> Certified Trainer
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div>
         </div>
      </section>

      {/* --- CTA FOOTER --- */}
      <section className="py-32 bg-brand-50 relative overflow-hidden text-center">
         <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent"></div>
         <div className="max-w-3xl mx-auto px-4 relative z-10">
            <FadeIn>
                <h2 className="text-5xl md:text-7xl font-black text-neutral-900 mb-8 tracking-tighter">Ready to start?</h2>
                <p className="text-xl text-neutral-500 mb-12 max-w-xl mx-auto">Join thousands of filmmakers who have leveled up their craft. The camera is rolling.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <a href="#courses" className="px-12 py-5 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 transition shadow-2xl shadow-brand-600/30 hover:-translate-y-1 hover:scale-105 active:scale-95">
                        Get Full Access
                    </a>
                    <button className="px-12 py-5 bg-white border border-neutral-200 text-neutral-900 rounded-full font-bold text-lg hover:bg-neutral-50 transition shadow-sm hover:border-neutral-400">
                        View Syllabus
                    </button>
                </div>
                <div className="mt-12 flex items-center justify-center gap-6 text-sm text-neutral-400">
                    <span className="flex items-center gap-2"><CheckCircle2 size={16} /> 30-Day Guarantee</span>
                    <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Lifetime Access</span>
                </div>
            </FadeIn>
         </div>
      </section>
    </div>
  );
};