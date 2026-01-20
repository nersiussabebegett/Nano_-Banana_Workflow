
import React, { useState, useCallback, useEffect } from 'react';
import { PromptConfig, MediaType, WorkflowState, Step } from './types';
import { GeminiService } from './services/geminiService';
import { 
  PlusIcon, 
  ArrowRightIcon, 
  ClipboardDocumentIcon, 
  SparklesIcon, 
  VideoCameraIcon, 
  PhotoIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface HistoryItem {
  id: string;
  prompt: string;
  type: MediaType;
  timestamp: number;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.INPUT);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('nano_banana_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [config, setConfig] = useState<PromptConfig>({
    concept: '',
    style: 'Cinematic 8K',
    lighting: 'Natural Sunlight',
    aspectRatio: '16:9',
    mediaType: MediaType.IMAGE
  });
  
  const [state, setState] = useState<WorkflowState>({
    config,
    optimizedPrompt: '',
    generatedUrl: null,
    isLoading: false,
    status: ''
  });

  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('nano_banana_history', JSON.stringify(history));
  }, [history]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, []);

  const handleOptimize = async () => {
    if (!config.concept.trim()) return;
    setState(prev => ({ ...prev, isLoading: true, status: 'Mengoptimalkan prompt dengan Gemini...' }));
    try {
      const optimized = await GeminiService.optimizePrompt(config);
      setState(prev => ({ ...prev, optimizedPrompt: optimized, isLoading: false }));
      
      // Tambah ke riwayat
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: optimized,
        type: config.mediaType,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev].slice(0, 20)); // Simpan 20 terakhir
      
      setCurrentStep(Step.OPTIMIZE);
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isLoading: false, status: 'Gagal mengoptimalkan prompt.' }));
    }
  };

  const handleGenerate = async () => {
    setState(prev => ({ ...prev, isLoading: true, status: `Memproses ${config.mediaType === MediaType.IMAGE ? 'Gambar' : 'Video'}...` }));
    try {
      let url = '';
      if (config.mediaType === MediaType.IMAGE) {
        url = await GeminiService.generateImage(state.optimizedPrompt, config.aspectRatio);
      } else {
        url = await GeminiService.generateVideo(state.optimizedPrompt, config.aspectRatio);
      }
      setState(prev => ({ ...prev, generatedUrl: url, isLoading: false }));
      setCurrentStep(Step.GENERATE);
    } catch (error: any) {
      console.error(error);
      const isKeyError = error.message?.includes("Requested entity was not found") || error.status === 404;
      if (isKeyError) {
        setState(prev => ({ ...prev, isLoading: false, status: 'Membutuhkan API Key Video...' }));
        (window as any).aistudio?.openSelectKey();
      } else {
        setState(prev => ({ ...prev, isLoading: false, status: 'Generasi gagal. Coba lagi.' }));
      }
    }
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const resetWorkflow = () => {
    setCurrentStep(Step.INPUT);
    setState({
      config,
      optimizedPrompt: '',
      generatedUrl: null,
      isLoading: false,
      status: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Riwayat */}
      <aside className="w-full md:w-80 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800 p-6 overflow-y-auto max-h-[40vh] md:max-h-screen">
        <div className="flex items-center gap-2 mb-6 text-slate-400 uppercase tracking-widest text-xs font-bold">
          <ClockIcon className="w-4 h-4" />
          Riwayat Prompt
        </div>
        <div className="space-y-4">
          {history.length === 0 && (
            <p className="text-slate-600 text-sm italic">Belum ada riwayat...</p>
          )}
          {history.map((item) => (
            <div key={item.id} className="group bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/50 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.type === MediaType.IMAGE ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                  {item.type}
                </span>
                <button onClick={() => deleteHistory(item.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 line-clamp-3 font-mono leading-relaxed mb-3">
                {item.prompt}
              </p>
              <button 
                onClick={() => handleCopy(item.prompt)}
                className="w-full py-1.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded-md flex items-center justify-center gap-1 transition-colors"
              >
                <ClipboardDocumentIcon className="w-3 h-3" /> Salin Prompt
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto">
        <header className="max-w-4xl w-full mx-auto mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent italic">
              NANO BANANA UNLIMITED
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Workflow prompt konsisten & generasi media instan.</p>
          </div>
          <button 
            onClick={resetWorkflow}
            className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all border border-slate-800 hover:border-slate-700 shadow-lg"
            title="Ulangi Workflow"
          >
            <ArrowPathIcon className="w-6 h-6 text-blue-400" />
          </button>
        </header>

        <main className="max-w-4xl w-full mx-auto space-y-10">
          {/* Step 1: Input */}
          <section className={`workflow-step bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-800 shadow-2xl transition-all duration-500 ${currentStep >= Step.INPUT ? 'opacity-100 scale-100' : 'opacity-30 grayscale scale-95 pointer-events-none'}`}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-500/20">1</div>
              <div>
                <h2 className="text-2xl font-bold">Input Konsep</h2>
                <p className="text-sm text-slate-500">Tulis apa yang ingin Anda ciptakan hari ini.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Deskripsi Konsep</span>
                  <textarea 
                    value={config.concept}
                    onChange={(e) => setConfig({...config, concept: e.target.value})}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none h-40 resize-none transition-all placeholder:text-slate-700"
                    placeholder="Contoh: Kucing astronot sedang memancing di atas awan planet Jupiter dengan pancingan emas..."
                  />
                </label>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mode Media</span>
                    <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 mt-2">
                      <button 
                        onClick={() => setConfig({...config, mediaType: MediaType.IMAGE})}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-all ${config.mediaType === MediaType.IMAGE ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <PhotoIcon className="w-5 h-5" /> Gambar
                      </button>
                      <button 
                        onClick={() => setConfig({...config, mediaType: MediaType.VIDEO})}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-all ${config.mediaType === MediaType.VIDEO ? 'bg-orange-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <VideoCameraIcon className="w-5 h-5" /> Video
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Rasio Layar</span>
                    <select 
                      value={config.aspectRatio}
                      onChange={(e) => setConfig({...config, aspectRatio: e.target.value})}
                      className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="16:9">16:9 Cinema</option>
                      <option value="9:16">9:16 TikTok</option>
                      <option value="1:1">1:1 Square</option>
                      <option value="4:3">4:3 Classic</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Gaya Visual</span>
                    <select 
                      value={config.style}
                      onChange={(e) => setConfig({...config, style: e.target.value})}
                      className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none font-medium"
                    >
                      <option>Cinematic 8K</option>
                      <option>Cyberpunk Anime</option>
                      <option>Hyper-Realistic</option>
                      <option>Surrealism Art</option>
                      <option>3D Pixar Style</option>
                      <option>Epic Oil Painting</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Atmosfer Cahaya</span>
                    <select 
                      value={config.lighting}
                      onChange={(e) => setConfig({...config, lighting: e.target.value})}
                      className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-3 outline-none font-medium"
                    >
                      <optgroup label="Natural">
                        <option>Natural Sunlight</option>
                        <option>Soft Daylighting</option>
                        <option>Golden Magic Hour</option>
                        <option>Cloudy Overcast</option>
                        <option>Morning Window Light</option>
                      </optgroup>
                      <optgroup label="Stylized">
                        <option>Dramatic Neon</option>
                        <option>Soft Volumetric</option>
                        <option>Dark & Moody</option>
                        <option>Bright Studio</option>
                        <option>Moonlight Ether</option>
                      </optgroup>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {currentStep === Step.INPUT && (
              <button 
                onClick={handleOptimize}
                disabled={!config.concept.trim() || state.isLoading}
                className="mt-8 w-full py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 transition-all"
              >
                {state.isLoading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <SparklesIcon className="w-6 h-6" />}
                OPTIMALKAN PROMPT
              </button>
            )}
          </section>

          {/* Step 2: Prompt Refinement */}
          <section className={`workflow-step bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-800 shadow-2xl transition-all duration-500 ${currentStep >= Step.OPTIMIZE ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-500/20">2</div>
                <div>
                  <h2 className="text-2xl font-bold">Hasil Prompt</h2>
                  <p className="text-sm text-slate-500">Prompt konsisten siap pakai atau generasi.</p>
                </div>
              </div>
              {state.optimizedPrompt && (
                <button 
                  onClick={() => handleCopy(state.optimizedPrompt)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border-2 ${copySuccess ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-200'}`}
                >
                  {copySuccess ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
                  {copySuccess ? 'BERHASIL!' : 'SALIN PROMPT'}
                </button>
              )}
            </div>

            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-sm md:text-base text-slate-300 leading-relaxed min-h-[120px] relative group">
              {state.optimizedPrompt || 'Menunggu optimasi...'}
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-1 rounded border border-slate-800 uppercase">Gemini Flash Optimized</span>
              </div>
            </div>

            {currentStep === Step.OPTIMIZE && (
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGenerate}
                  disabled={state.isLoading}
                  className="flex-[2] py-5 bg-gradient-to-r from-orange-500 to-red-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/20 transition-all"
                >
                  {state.isLoading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <PlusIcon className="w-6 h-6" />}
                  GENERASI {config.mediaType === MediaType.IMAGE ? 'GAMBAR' : 'VIDEO'}
                </button>
                <button 
                  onClick={() => setCurrentStep(Step.INPUT)}
                  className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300 transition-all border border-slate-700"
                >
                  KEMBALI
                </button>
              </div>
            )}
          </section>

          {/* Step 3: Result */}
          <section className={`workflow-step bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-800 shadow-2xl transition-all duration-500 ${currentStep >= Step.GENERATE ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-emerald-500/20">3</div>
              <div>
                <h2 className="text-2xl font-bold">Output Media</h2>
                <p className="text-sm text-slate-500">Hasil akhir kreasi Anda.</p>
              </div>
            </div>

            <div className="aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner group">
              {state.isLoading && currentStep === Step.OPTIMIZE ? (
                <div className="text-center p-10">
                  <div className="relative mb-6">
                    <ArrowPathIcon className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
                    <SparklesIcon className="w-6 h-6 text-yellow-400 absolute top-0 right-1/2 translate-x-8 animate-pulse" />
                  </div>
                  <p className="text-xl font-bold text-white mb-2 italic">Menciptakan Mahakarya...</p>
                  <p className="text-slate-500 text-sm animate-pulse">{state.status}</p>
                </div>
              ) : state.generatedUrl ? (
                config.mediaType === MediaType.IMAGE ? (
                  <img src={state.generatedUrl} alt="Generated asset" className="w-full h-full object-contain" />
                ) : (
                  <video src={state.generatedUrl} controls autoPlay loop className="w-full h-full object-contain" />
                )
              ) : (
                <div className="text-center text-slate-700">
                  <PhotoIcon className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="italic font-medium">Klik tombol generasi di atas untuk melihat hasil.</p>
                </div>
              )}
            </div>

            {currentStep === Step.GENERATE && (
               <div className="mt-8 flex gap-4">
                  <button 
                    onClick={resetWorkflow}
                    className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-2xl font-black text-lg text-white transition-all flex items-center justify-center gap-3 shadow-xl"
                  >
                    MULAI WORKFLOW BARU <ArrowRightIcon className="w-6 h-6" />
                  </button>
                  {state.generatedUrl && (
                    <a 
                      href={state.generatedUrl} 
                      download={`nano-banana-${Date.now()}.${config.mediaType === MediaType.IMAGE ? 'png' : 'mp4'}`}
                      className="px-8 py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-200 border border-slate-700 flex items-center justify-center"
                    >
                      UNDUH
                    </a>
                  )}
               </div>
            )}
          </section>
        </main>

        <footer className="max-w-4xl w-full mx-auto mt-16 py-10 border-t border-slate-900 text-center">
          <div className="flex items-center justify-center gap-6 text-slate-600 text-sm font-medium">
             <span>Gemini 3 Flash</span>
             <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
             <span>Gemini 2.5 Image</span>
             <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
             <span>Veo 3.1 Fast</span>
          </div>
          <p className="text-slate-700 mt-4 text-xs font-bold uppercase tracking-widest">
            Developed with ❤️ for Creative Freedom
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
