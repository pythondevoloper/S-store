import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  X, 
  Cpu, 
  Monitor, 
  Flame, 
  Trophy, 
  ShieldAlert, 
  Play, 
  Gamepad2, 
  CheckCircle2, 
  AlertCircle,
  Award,
  Download,
  Share2,
  Settings,
  HardDrive,
  Activity
} from 'lucide-react';
import { Product } from '../types';

interface StressTestProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'uz' | 'en';
  products: Product[];
}

interface Build {
  cpu: Product | null;
  gpu: Product | null;
  ram: Product | null;
  psu: Product | null;
}

type Game = 'Minecraft RTX' | 'Cyberpunk 2077' | 'Valorant';

const StressTest: React.FC<StressTestProps> = ({ isOpen, onClose, language, products }) => {
  const [build, setBuild] = useState<Build>({ cpu: null, gpu: null, ram: null, psu: null });
  const [selectedGame, setSelectedGame] = useState<Game>('Minecraft RTX');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'failed' | 'passed'>('idle');
  const [testProgress, setTestProgress] = useState(0);
  const [failureReason, setFailureReason] = useState('');

  const categories = {
    cpu: products.filter(p => p.category.toLowerCase().includes('processor') || p.category.toLowerCase().includes('cpu')),
    gpu: products.filter(p => p.category.toLowerCase().includes('card') || p.category.toLowerCase().includes('gpu')),
    ram: products.filter(p => p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memory')),
    psu: products.filter(p => p.category.toLowerCase().includes('power') || p.category.toLowerCase().includes('psu'))
  };

  const startTest = () => {
    if (!build.cpu || !build.gpu || !build.ram || !build.psu) return;
    
    setTestState('testing');
    setTestProgress(0);
    
    const interval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          evaluateBuild();
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  const evaluateBuild = () => {
    const { cpu, gpu, ram, psu } = build;
    if (!cpu || !gpu || !ram || !psu) return;

    let passed = true;
    let reason = '';

    // Simple logic for evaluation
    if (selectedGame === 'Cyberpunk 2077') {
      if (gpu.price < 800) {
        passed = false;
        reason = language === 'uz' ? "Videokarta juda kuchsiz! FPS 10 dan past." : "GPU is too weak! FPS below 10.";
      } else if (cpu.price < 400) {
        passed = false;
        reason = language === 'uz' ? "Protsessor Cyberpunk uchun yetarli emas." : "CPU is insufficient for Cyberpunk.";
      }
    } else if (selectedGame === 'Minecraft RTX') {
      if (!gpu.name.toLowerCase().includes('rtx')) {
        passed = false;
        reason = language === 'uz' ? "RTX videokarta kerak!" : "RTX GPU required!";
      }
    }

    // PSU Check (Power consumption simulation)
    const estimatedPower = (cpu.price / 10) + (gpu.price / 5);
    if (psu.price < estimatedPower / 2) {
      passed = false;
      reason = language === 'uz' ? "Blok pitaniya portlab ketdi! Quvvat yetmadi." : "PSU exploded! Insufficient power.";
    }

    setTestState(passed ? 'passed' : 'failed');
    setFailureReason(reason);
  };

  const reset = () => {
    setTestState('idle');
    setTestProgress(0);
    setFailureReason('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8"
        >
          <div className="w-full max-w-6xl h-[90vh] bg-[#050505] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-[0_0_150px_rgba(255,0,0,0.1)]">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-red-600/20 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Flame className="w-7 h-7 text-red-500" />
                  </motion.div>
                  <div className="absolute inset-0 bg-red-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                    Build & <span className="text-red-600">Destroy</span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Activity className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Stress Test Simulator v1.0</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-4 bg-white/5 hover:bg-red-600/20 rounded-2xl transition-all text-gray-500 hover:text-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left: Component Selection */}
              <div className="w-full lg:w-1/2 border-r border-white/5 p-8 overflow-y-auto custom-scrollbar space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> 1. Tizimni yig'ing
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(Object.keys(categories) as Array<keyof Build>).map((cat) => (
                      <div key={cat} className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">{cat}</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-red-600/50 transition-all appearance-none"
                          onChange={(e) => {
                            const product = products.find(p => p.id === e.target.value);
                            setBuild(prev => ({ ...prev, [cat]: product || null }));
                          }}
                          value={build[cat]?.id || ''}
                        >
                          <option value="">Tanlang...</option>
                          {categories[cat].map(p => (
                            <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" /> 2. O'yinni tanlang
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Minecraft RTX', 'Cyberpunk 2077', 'Valorant'] as Game[]).map(game => (
                      <button
                        key={game}
                        onClick={() => setSelectedGame(game)}
                        className={`p-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                          selectedGame === game 
                            ? 'bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                            : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        {game}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    disabled={!build.cpu || !build.gpu || !build.ram || !build.psu || testState === 'testing'}
                    onClick={startTest}
                    className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Stress Testni boshlash
                  </button>
                </div>
              </div>

              {/* Right: Simulation Area */}
              <div className="flex-1 bg-black relative overflow-hidden flex flex-col items-center justify-center p-12">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                <AnimatePresence mode="wait">
                  {testState === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="text-center space-y-6 relative z-10"
                    >
                      <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10">
                        <Monitor className="w-16 h-16 text-gray-700" />
                      </div>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        Tizim tayyor. Testni boshlash uchun tugmani bosing.
                      </p>
                    </motion.div>
                  )}

                  {testState === 'testing' && (
                    <motion.div
                      key="testing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full max-w-md space-y-8 relative z-10"
                    >
                      <div className="text-center space-y-2">
                        <h4 className="text-4xl font-black italic tracking-tighter uppercase text-white">
                          {selectedGame} <span className="text-red-600">Loading...</span>
                        </h4>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Hardware Stress: {testProgress}%</p>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                          className="h-full bg-red-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${testProgress}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Temp</p>
                          <p className="text-xl font-black text-white">{Math.floor(40 + (testProgress * 0.5))}°C</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Load</p>
                          <p className="text-xl font-black text-white">{Math.floor(testProgress)}%</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {testState === 'failed' && (
                    <motion.div
                      key="failed"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-8 relative z-10"
                    >
                      <div className="relative">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="absolute inset-0 bg-red-600/50 blur-3xl rounded-full"
                        />
                        <div className="w-40 h-40 bg-red-600 rounded-[3rem] flex items-center justify-center mx-auto relative z-10 shadow-[0_0_100px_rgba(220,38,38,0.8)]">
                          <Flame className="w-24 h-24 text-white" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-5xl font-black uppercase tracking-tighter text-red-600 italic">SYSTEM FAILURE</h4>
                        <p className="text-white font-bold text-lg max-w-sm mx-auto">{failureReason}</p>
                      </div>
                      <button
                        onClick={reset}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                      >
                        Qayta urinish
                      </button>
                    </motion.div>
                  )}

                  {testState === 'passed' && (
                    <motion.div
                      key="passed"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center space-y-8 relative z-10"
                    >
                      <div className="relative">
                        <motion.div
                          animate={{ 
                            rotate: 360,
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full"
                        />
                        <div className="w-48 h-48 bg-emerald-500 rounded-[4rem] flex items-center justify-center mx-auto relative z-10 shadow-[0_0_100px_rgba(16,185,129,0.5)]">
                          <Trophy className="w-24 h-24 text-white" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-5xl font-black uppercase tracking-tighter text-emerald-500 italic">ULTRA UNLOCKED</h4>
                        <p className="text-white/60 font-bold uppercase tracking-[0.3em] text-xs">Siz mukammal tizim yig'dingiz!</p>
                      </div>

                      {/* Certificate */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white p-8 rounded-[2rem] shadow-2xl text-black max-w-md mx-auto relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4">
                          <Award className="w-12 h-12 text-emerald-500 opacity-20" />
                        </div>
                        <div className="border-4 border-emerald-500/20 p-6 rounded-xl space-y-4">
                          <h5 className="text-2xl font-black uppercase tracking-tighter italic">S-Build Certificate</h5>
                          <div className="h-px bg-black/10 w-full" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ushbu sertifikat egasi</p>
                          <p className="text-xl font-black uppercase tracking-tight">{selectedGame} Master</p>
                          <p className="text-[9px] font-bold text-gray-400">Tizim barcha stress testlardan muvaffaqiyatli o'tdi.</p>
                          <div className="flex justify-center gap-4 pt-4">
                            <button className="p-3 bg-black text-white rounded-xl hover:bg-emerald-600 transition-all">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-3 bg-black text-white rounded-xl hover:bg-emerald-600 transition-all">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      <button
                        onClick={reset}
                        className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                      >
                        Yangi test boshlash
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(220, 38, 38, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </AnimatePresence>
  );
};

export default StressTest;
