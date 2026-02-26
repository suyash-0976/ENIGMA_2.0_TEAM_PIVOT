import React, { useState } from 'react';
import { Upload, Activity, Brain, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      setLoading(true);
      setResult(null); 
      
      try {
        // Updated port to 5005 to match the backend
        const response = await fetch('http://localhost:5005/api/analyze', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Result from backend:", data); 
        setResult(data);
      } catch (error) {
        console.error("Error analyzing file:", error);
        alert("Backend error occurred. Please make sure the backend is running on port 5005.");
      } finally {
        setLoading(false);
      }
    }
  };

  const getBandData = () => {
      if (!result || !result.metrics || !result.metrics.bands_relative_power) return [];
      const bands = result.metrics.bands_relative_power;
      return [
          { name: 'Delta', power: bands.Delta * 100 },
          { name: 'Theta', power: bands.Theta * 100 },
          { name: 'Alpha', power: bands.Alpha * 100 },
          { name: 'Beta', power: bands.Beta * 100 },
          { name: 'Gamma', power: bands.Gamma * 100 }
      ];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <Brain className="w-10 h-10 text-cyan-400" />
          <h1 className="text-3xl font-bold tracking-tight">NEURO-SCAN <span className="text-cyan-400">AI</span></h1>
        </div>
        <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm text-slate-400">
          Status: <span className="text-green-400">System Ready</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" /> EEG Upload
            </h2>
            <label className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500 hover:bg-slate-800/50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-slate-500 mb-2 group-hover:text-cyan-400" />
                <p className="text-sm text-slate-400 text-center px-4">{file ? file.name : "Select EEG CSV File"}</p>
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleUpload} />
            </label>
            
            {loading && (
              <div className="mt-4 flex items-center justify-center gap-3 text-cyan-400 animate-pulse">
                <Activity className="animate-spin" /> Processing Brainwaves...
              </div>
            )}
          </div>

          {result && (
            <div className={`p-6 rounded-2xl border ${result.risk_score > 50 ? 'bg-red-950/30 border-red-900' : 'bg-green-950/30 border-green-900'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium uppercase tracking-wider">Risk Score</span>
                {result.risk_score > 50 ? <AlertCircle className="text-red-500" /> : <CheckCircle2 className="text-green-500" />}
              </div>
              <div className="text-5xl font-bold mb-1">{result.risk_score}%</div>
              <p className="text-sm text-slate-400">
                {result.risk_score > 50 ? "High probability of Neurological biomarkers detected." : "Normal neurological patterns observed."}
              </p>
            </div>
          )}

           {result && result.metrics && (
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
               <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Clinical Explanation
               </h3>
               <p className="text-sm text-slate-300 leading-relaxed mb-3">
                 Model prediction is largely driven by the Gamma/Alpha ratio. A higher ratio indicates abnormal hyper-connectivity.
               </p>
               <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Calculated Ratio:</span>
                  <span className="font-mono text-cyan-400">{result.metrics.gamma_alpha_ratio}</span>
               </div>
             </div>
           )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-[400px]">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> Signal Visualization (Downsampled)
            </h2>
            {result ? (
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={result.chart_data.map((val: any, i: number) => ({ i, val }))}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="i" hide />
                  <YAxis stroke="#475569" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Area type="monotone" dataKey="val" stroke="#22d3ee" fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-slate-800 rounded-lg border-dotted">
                <p>Upload data to see signal patterns</p>
              </div>
            )}
          </div>

          {result && result.metrics && (
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-[300px]">
             <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
               <Brain className="w-5 h-5 text-cyan-400" /> Frequency Band Power (Relative)
             </h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={getBandData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#475569" fontSize={12} />
                  <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(value: number) => value.toFixed(2) + '%'}/>
                  <Bar dataKey="power" radius={[4, 4, 0, 0]}>
                    {getBandData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Gamma' ? '#f43f5e' : entry.name === 'Alpha' ? '#22c55e' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;