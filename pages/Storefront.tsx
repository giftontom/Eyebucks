import { Play, Star, ArrowRight, Users, CheckCircle2, Layers, X, Plus, Award, Globe, Clapperboard, Sparkles, Search, BookOpen, Video, Palette } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge, Button } from '../components';
import { HeroCarousel } from '../components/HeroCarousel';
import { CourseCardSkeleton } from '../components/CourseCardSkeleton';
import { useAuth } from '../context/AuthContext';
import { coursesApi, siteContentApi } from '../services/api';
import { CourseType } from '../types';

import type { Course } from '../types';


// --- Fallback Data ---

const DEFAULT_FAQS = [
  { q: "Do I need expensive gear to start?", a: "Absolutely not. We have dedicated modules for smartphone filmmaking and budget DSLRs. The principles of lighting and composition apply regardless of the camera." },
  { q: "Is this suitable for complete beginners?", a: "Yes. Our 'Zero to Hero' bundles start with the absolute basics of ISO, Shutter Speed, and Aperture before moving into advanced color grading." },
  { q: "Do I get access to the raw footage?", a: "Yes! All editing courses come with 100GB+ of 6K RAW footage so you can practice grading professional clips, not just your own backyard footage." },
  { q: "How does the community feedback work?", a: "You upload your work to our private Discord. Verified pro instructors review your edits/stills weekly and provide video feedback." },
];

const DEFAULT_TESTIMONIALS = [
  { name: "Marcus Chen", role: "Freelance Director", image: "/model_1.png", text: "I was stuck charging ₹15k per video. After the 'Business of Filmmaking' module, I landed my first ₹1.5L commercial client. The contract templates alone are worth the price." },
  { name: "Sarah Williams", role: "Content Creator", image: "/model_2.png", text: "YouTube tutorials are fragmented. Eyebuckz gave me a roadmap. I stopped guessing if my lighting was right—now I know it is." },
  { name: "David Okonjo", role: "Colorist", image: "/model_3.png", text: "The DaVinci Resolve masterclass is insane. The node structures provided have saved me hours on every project." },
];

// --- Animation Helper ---
const FadeIn = React.memo<{ children: React.ReactNode; delay?: number; className?: string }>(({ children, delay = 0, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) {return;}
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); } },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );
        observer.observe(el);
        return () => { observer.unobserve(el); };
    }, []);

    return (
        <div ref={ref} className={`transition-all duration-1000 ease-out transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
});
FadeIn.displayName = 'FadeIn';

// --- Course Card (Dark Glass Style) ---
const CourseCard = React.memo<{ course: Course; index: number; onBuy: (courseId: string) => void }>(({ course, index, onBuy }) => {
    const isBundle = course.type === CourseType.BUNDLE;
    return (
        <FadeIn delay={index * 50} className={`${isBundle ? 'lg:col-span-2' : ''}`}>
            <div className="group flex flex-col t-card rounded-3xl overflow-hidden t-border border hover:border-white/20 transition-all duration-300 hover:-translate-y-1 h-full backdrop-blur-sm">
                <Link to={`/course/${course.id}`} className={`relative overflow-hidden bg-neutral-900 block ${isBundle ? 'aspect-[2.2/1]' : 'aspect-[4/3]'}`}>
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge variant="default" size="md" className="uppercase tracking-wide backdrop-blur-md">{course.type}</Badge>
                        {isBundle && <Badge variant="brand" size="md" className="uppercase tracking-wide animate-pulse shadow-lg shadow-brand-500/40">Best Value</Badge>}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <div className="group-hover:scale-110 transition-transform duration-300 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-md">
                                <Play size={32} fill="white" className="ml-1 text-white" />
                            </div>
                            <span className="text-white font-bold tracking-widest text-sm uppercase">Preview Course</span>
                        </div>
                    </div>
                </Link>
                <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-3 mb-4 text-xs font-bold t-text-3">
                        <div className="flex text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                            <Star size={12} fill="currentColor" className="mr-1"/>
                            <span>{course.rating || '4.8'}</span>
                        </div>
                        <span className="flex items-center gap-1 t-text-2"><Users size={12}/> {course.totalStudents || 0} Students</span>
                        {isBundle && course.bundledCourses ? (
                            <span className="flex items-center gap-1 t-text-2"><Layers size={12}/> {course.bundledCourses.length} Courses</span>
                        ) : (
                            <span className="flex items-center gap-1 t-text-2"><Clapperboard size={12}/> {(course.chapters?.length || 0)} Lessons</span>
                        )}
                    </div>
                    <Link to={`/course/${course.id}`} className="block">
                        <h3 className="text-2xl font-bold t-text mb-3 group-hover:text-brand-400 transition-colors leading-tight">{course.title}</h3>
                        <p className="t-text-2 mb-8 line-clamp-2 text-sm leading-relaxed">{course.description}</p>
                    </Link>
                    <div className="mt-auto flex items-center justify-between pt-6 border-t t-border">
                        <div className="flex flex-col">
                            <span className="text-xs t-text-3 line-through font-medium">₹{Math.round(course.price * 1.5 / 100).toLocaleString()}</span>
                            <div className="text-2xl font-bold t-text">₹{(course.price / 100).toLocaleString()}</div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onBuy(course.id); }}
                            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-brand-600/20 hover:-translate-y-0.5"
                        >
                            Buy Now <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </FadeIn>
    );
});
CourseCard.displayName = 'CourseCard';

// --- Value card data ---
const VALUE_CARDS = [
  { icon: BookOpen, title: 'Practical Learning', description: 'Hands-on projects with professional raw footage. No theory-only lectures — you build real portfolio pieces.' },
  { icon: Award, title: 'Industry Experts', description: 'Learn from working professionals who shoot for major brands. Get insider techniques and workflows.' },
  { icon: Video, title: 'Creator-Focused', description: 'Built for filmmakers who want to go full-time. Business templates, client management, and monetization strategies.' },
];

export const Storefront: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | CourseType>('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);

  const loadCourses = () => {
    setLoadError(false);
    setIsLoading(true);
    coursesApi.getCourses()
      .then(res => { setCourses(res.courses); })
      .catch(err => { console.error('[Storefront] Failed to load courses:', err); setLoadError(true); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadCourses(); }, []);

  useEffect(() => {
    siteContentApi.getBySection('faq').then(items => {
      if (items.length > 0) {setFaqs(items.map(i => ({ q: i.title, a: i.body })));}
    }).catch(() => {});
    siteContentApi.getBySection('testimonial').then(items => {
      if (items.length > 0) {setTestimonials(items.map(i => ({
        name: i.title, text: i.body,
        role: (i.metadata as any)?.role || '',
        image: (i.metadata as any)?.image || '',
      })));}
    }).catch(() => {});
  }, []);

  const handleBuy = React.useCallback((courseId: string) => {
    navigate(`/checkout/${courseId}`);
  }, [navigate]);

  const filteredCourses = courses.filter(c => {
    if (filterType !== 'ALL' && c.type !== filterType) {return false;}
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="t-bg font-sans t-text overflow-x-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden t-bg pt-28 pb-16 px-4">
        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] bg-brand-600/20 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] bg-orange-500/15 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Announcement pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] backdrop-blur-xl text-[#FF6B6B] text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in-up hover:bg-[rgba(255,59,48,0.15)] transition duration-300 cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            New Cohort Starting Soon
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-[0.9] animate-fade-in-up" style={{ fontFamily: "var(--font-display)" }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">
              Master the Craft
            </span>
            <br />
            <span className="t-text">of Filmmaking.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl t-text-2 mb-10 max-w-2xl mx-auto animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Professional courses, raw assets, and a community of creators.
            Everything you need to go from beginner to full-time filmmaker.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="group w-full sm:w-auto h-14 px-10 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.7)] hover:scale-105 hover:bg-brand-500"
            >
              Start Learning <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <a
              href="https://youtube.com/@eyebuckz"
              target="_blank"
              rel="noreferrer"
              className="group w-full sm:w-auto h-14 px-10 rounded-full t-card t-border border hover:bg-[var(--surface-hover)] t-text font-bold text-lg flex items-center justify-center gap-3 transition-all backdrop-blur-sm hover:scale-105"
            >
              <Play size={20} fill="currentColor" /> Watch Trailer
            </a>
          </div>

          {/* Hero Carousel */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <HeroCarousel />
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
              <Sparkles size={16} className="text-brand-500" /> 15+ Courses
            </span>
            <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
              <CheckCircle2 size={16} className="text-green-500" /> Lifetime Access
            </span>
            <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
              <Award size={16} className="text-yellow-500" /> Certificate Included
            </span>
          </div>

          {/* Academy seal */}
          <p className="text-xs t-text-3 uppercase tracking-[0.3em] font-bold mt-8 flex items-center justify-center gap-2">
            <img src="/academy_symbol.png" className="h-8 w-8 opacity-50 inline-block" alt="" />
            Creators &amp; Influencers Academy #1
          </p>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF TICKER ═══════════ */}
      <section className="t-bg border-b t-border overflow-hidden py-6 relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--page-bg)] to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--page-bg)] to-transparent z-10"></div>
        <div className="flex w-full whitespace-nowrap overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-300">
          <div className="flex animate-marquee items-center gap-16 min-w-full px-4 text-sm font-bold t-text-2 uppercase tracking-[0.2em]">
            {[...Array(6)].map((_, i) => (
              <React.Fragment key={i}>
                <span className="flex items-center gap-3 hover:text-white transition-colors"><Users size={18} className="text-brand-600"/> 10,000+ Students</span>
                <span className="t-text-3">/</span>
                <span className="flex items-center gap-3 hover:text-white transition-colors"><Star size={18} className="text-yellow-500 fill-yellow-500"/> 4.9/5 Rating</span>
                <span className="t-text-3">/</span>
                <span className="flex items-center gap-3 hover:text-white transition-colors"><Globe size={18} className="text-blue-500"/> 50+ Countries</span>
                <span className="t-text-3">/</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ WHY EYEBUCKZ — VALUE CARDS ═══════════ */}
      <section className="py-24 t-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-xs mb-4">Why Eyebuckz</span>
              <h2 className="text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: "var(--font-display)" }}>
                Built for Creators Who Mean It.
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE_CARDS.map((card, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="t-card t-border border rounded-2xl p-8 hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 h-full group">
                  <div className="w-14 h-14 bg-brand-600/10 border border-brand-600/20 rounded-2xl flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform">
                    <card.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold t-text mb-3">{card.title}</h3>
                  <p className="t-text-2 leading-relaxed">{card.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ECOSYSTEM — 2-COLUMN GRADIENT PANELS ═══════════ */}
      <section className="py-24 t-bg-alt">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 t-card t-border border t-text-2 rounded-full font-bold tracking-wider uppercase text-xs mb-4">The Ecosystem</span>
              <h2 className="text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: "var(--font-display)" }}>More Than Just Videos.</h2>
              <p className="t-text-2 text-lg mt-4 max-w-2xl mx-auto">We provide the actual tools you need to execute the job.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Premium Courses Panel */}
            <FadeIn>
              <div className="rounded-3xl overflow-hidden t-border border t-card group hover:border-white/20 transition-all duration-300">
                <div className="h-56 bg-gradient-to-br from-brand-600 to-orange-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/premium_courses_cover.png')] bg-cover bg-center opacity-60 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute bottom-6 left-6">
                    <Palette size={32} className="text-white/80" />
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold t-text mb-3">Premium Courses</h3>
                  <p className="t-text-2 leading-relaxed mb-4">From cinematography fundamentals to advanced color grading — structured curricula with 100GB+ raw assets included.</p>
                  <div className="flex gap-4 text-xs font-bold t-text-3 mb-6">
                    <span>50+ Courses</span><span className="t-text-3">|</span><span>200h Content</span><span className="t-text-3">|</span><span>1K+ Students</span>
                  </div>
                  <a href="#courses" className="text-brand-400 font-bold text-sm flex items-center gap-2 hover:text-brand-300 transition-colors group/link">
                    Browse Catalog <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* Digital Assets Panel */}
            <FadeIn delay={100}>
              <div className="rounded-3xl overflow-hidden t-border border t-card group hover:border-white/20 transition-all duration-300">
                <div className="h-56 bg-gradient-to-br from-amber-500 to-yellow-400 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/digital_assets_cover.png')] bg-cover bg-center opacity-60 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute bottom-6 left-6">
                    <Layers size={32} className="text-white/80" />
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold t-text mb-3">Digital Assets</h3>
                  <p className="t-text-2 leading-relaxed mb-4">50+ LUTs, contract templates, business presets, and 6K RAW footage from RED and Arri Alexa cameras.</p>
                  <div className="flex gap-4 text-xs font-bold t-text-3 mb-6">
                    <span>1000+ Assets</span><span className="t-text-3">|</span><span>5K+ Downloads</span><span className="t-text-3">|</span><span>Free Samples</span>
                  </div>
                  <a href="#courses" className="text-amber-400 font-bold text-sm flex items-center gap-2 hover:text-amber-300 transition-colors group/link">
                    Explore Assets <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════ COURSES GRID ═══════════ */}
      <section id="courses" className="py-24 t-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-6">
              <div>
                <h2 className="text-4xl font-bold t-text mb-2" style={{ fontFamily: "var(--font-display)" }}>Masterclass Catalog</h2>
                <p className="t-text-2 text-lg">Choose your path. From cinematography to color grading.</p>
              </div>
              {/* Filters */}
              <div className="flex t-card p-1.5 rounded-xl t-border border">
                {['ALL', 'BUNDLE', 'MODULE'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                      filterType === type
                        ? 'bg-white/10 dark:bg-white/10 bg-black/10 t-text shadow-md'
                        : 't-text-3 hover:t-text-2 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {type === 'ALL' ? 'All' : type === 'BUNDLE' ? 'Bundles' : 'Modules'}
                  </button>
                ))}
              </div>
            </div>
            {/* Search Bar */}
            <div className="relative mb-10">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by title or description..."
                className="w-full pl-12 pr-10 py-4 rounded-2xl t-border border t-input-bg t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-lg backdrop-blur-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X size={20} />
                </button>
              )}
            </div>
          </FadeIn>

          {searchQuery && !isLoading && (
            <p className="text-sm t-text-3 mb-4">
              Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          ) : loadError ? (
            <div className="text-center py-24">
              <p className="t-text-2 mb-4">Failed to load courses. Please check your connection and try again.</p>
              <button onClick={loadCourses} className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-full transition">
                Retry
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-24">
              {courses.length === 0 ? (
                <p className="t-text-3">No courses available yet.</p>
              ) : (
                <>
                  <p className="t-text-2 mb-4">No courses match your search.</p>
                  <button onClick={() => { setSearchQuery(''); setFilterType('ALL'); }} className="text-brand-400 hover:text-brand-300 font-medium transition">
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} onBuy={handleBuy} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="py-24 t-bg-alt overflow-hidden border-t t-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 t-text" style={{ fontFamily: "var(--font-display)" }}>Don't just take our word for it.</h2>
              <p className="t-text-2 text-lg">Join a community of serious filmmakers.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="t-card t-border border p-8 rounded-3xl backdrop-blur-sm hover:border-white/20 transition duration-300 h-full">
                  <div className="flex gap-1 text-yellow-500 mb-6">
                    {[...Array(5)].map((_, idx) => <Star key={idx} size={18} fill="currentColor"/>)}
                  </div>
                  <p className="t-text-2 mb-8 leading-relaxed text-lg">"{t.text}"</p>
                  <div className="flex items-center gap-4 border-t t-border pt-6">
                    <img src={t.image} className="w-12 h-12 rounded-full border-2 border-brand-600 object-cover" alt={t.name} />
                    <div>
                      <h4 className="font-bold t-text">{t.name}</h4>
                      <p className="text-xs t-text-3 uppercase tracking-wide font-bold">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-24 t-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold t-text mb-12 text-center" style={{ fontFamily: "var(--font-display)" }}>Frequently Asked Questions</h2>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <FadeIn key={idx} delay={idx * 50}>
                <div className="t-card t-border border rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20 group">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-6 hover:bg-black/5 dark:hover:bg-white/5 transition text-left"
                  >
                    <span className="font-bold t-text text-lg group-hover:text-brand-400 transition-colors">{faq.q}</span>
                    {openFaq === idx ? <X size={24} className="t-text-3 shrink-0"/> : <Plus size={24} className="t-text-3 shrink-0"/>}
                  </button>
                  {openFaq === idx && (
                    <div className="p-6 pt-0 border-t t-border t-text-2 leading-relaxed text-lg animate-slide-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA FOOTER ═══════════ */}
      <section className="py-32 t-bg-alt relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-brand-600/15 rounded-full blur-[150px] pointer-events-none animate-glow-pulse" />

        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <FadeIn>
            <div className="t-card t-border border backdrop-blur-xl rounded-3xl p-12 md:p-16 text-center">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6" style={{ fontFamily: "var(--font-display)" }}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">Ready to start?</span>
              </h2>
              <p className="text-xl t-text-2 mb-10 max-w-xl mx-auto">Join thousands of filmmakers who have leveled up their craft. The camera is rolling.</p>
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={20} />}
                onClick={() => { const el = document.getElementById('courses'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                className="shadow-2xl shadow-brand-600/30 hover:-translate-y-1 hover:scale-105 active:scale-95 px-12 py-5"
              >
                Get Full Access
              </Button>
              <div className="mt-10 flex items-center justify-center gap-6 text-sm t-text-3">
                <span className="flex items-center gap-2"><CheckCircle2 size={16} /> 30-Day Guarantee</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Lifetime Access</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
};
