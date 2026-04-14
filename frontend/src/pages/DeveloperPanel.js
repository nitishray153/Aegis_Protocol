import { useState } from 'react';
import { createModel, uploadModelFile } from '../lib/api';
import { signTransaction } from '../lib/wallet';
import { Code, UploadSimple, ShieldCheck, Wallet, CheckCircle, Spinner } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function DeveloperPanel({ wallet }) {
  const [form, setForm] = useState({ name: '', model_type: 'LSTM', strategy: '', description: '' });
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1=form, 2=upload, 3=done
  const [createdModel, setCreatedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleCreateModel = async () => {
    if (!form.name || !form.strategy) return toast.error('Name and strategy are required');
    if (!wallet) return toast.error('Connect wallet first');

    setLoading(true);
    try {
      // Sign the model creation with wallet
      const txResult = await signTransaction('CREATE_MODEL', { name: form.name, model_type: form.model_type });
      
      const res = await createModel({
        ...form,
        developer_wallet: wallet.address
      });
      setCreatedModel(res.data);
      setStep(2);
      toast.success('Model created! Now upload your code.');
    } catch (e) {
      toast.error('Model creation failed');
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file || !createdModel) return toast.error('Select a file to upload');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('strategy_doc', form.strategy);
      
      const res = await uploadModelFile(createdModel.id, formData);
      setUploadResult(res.data);
      setStep(3);
      toast.success('Model uploaded to IPFS successfully!');
    } catch (e) {
      toast.error('Upload failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="developer-page">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Developer Panel</span>
          <h1 className="font-heading text-2xl sm:text-3xl text-white mt-1">Upload Your Model</h1>
          <p className="text-sm text-neutral-400 mt-2">Submit your trading model to the protocol. Code is stored on IPFS. Model approval is governed by DAO votes.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { n: 1, label: 'Define Model' },
            { n: 2, label: 'Upload Code' },
            { n: 3, label: 'Submitted' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-6 h-6 flex items-center justify-center text-xs font-mono ${step >= s.n ? 'bg-[#00D4FF] text-black' : 'bg-white/5 text-neutral-500'}`}>
                {step > s.n ? <CheckCircle size={14} weight="bold" /> : s.n}
              </div>
              <span className={`text-xs ${step >= s.n ? 'text-white' : 'text-neutral-500'}`}>{s.label}</span>
              {s.n < 3 && <div className={`w-12 h-px ${step > s.n ? 'bg-[#00D4FF]' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Model Form */}
        {step === 1 && (
          <div className="bg-[#0F0F0F] border border-white/10 p-6 space-y-4" data-testid="model-form">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Model Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Delta LSTM v2"
                data-testid="model-name-input"
                className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white text-sm focus:border-[#00D4FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Model Type</label>
              <div className="flex gap-2 mt-1">
                {['LSTM', 'GRU', 'Ensemble'].map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, model_type: t }))}
                    data-testid={`model-type-${t.toLowerCase()}`}
                    className={`px-4 py-2 text-xs font-mono transition-colors ${form.model_type === t ? 'bg-[#00D4FF] text-black' : 'bg-white/5 text-neutral-400 border border-white/10 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Strategy Explanation</label>
              <textarea
                value={form.strategy}
                onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
                rows={3}
                placeholder="Describe your trading strategy..."
                data-testid="model-strategy-input"
                className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white text-sm focus:border-[#00D4FF] focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Technical details about the model..."
                data-testid="model-description-input"
                className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white text-sm focus:border-[#00D4FF] focus:outline-none resize-none"
              />
            </div>

            {!wallet && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-400">
                <Wallet size={14} />
                Connect your wallet to submit a model
              </div>
            )}

            <button
              onClick={handleCreateModel}
              disabled={loading || !wallet}
              data-testid="create-model-button"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-[#00D4FF] text-black text-sm font-semibold hover:bg-[#00B4D8] transition-colors disabled:opacity-50"
            >
              <Wallet size={16} weight="bold" />
              {loading ? 'Signing...' : 'Create Model (Sign with Wallet)'}
            </button>
          </div>
        )}

        {/* Step 2: File Upload */}
        {step === 2 && (
          <div className="bg-[#0F0F0F] border border-white/10 p-6 space-y-4" data-testid="upload-form">
            <div className="p-3 bg-[#050505] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-[#00D4FF]" />
                <span className="text-xs text-white font-medium">Model Created</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-500">ID</span>
                  <div className="font-mono text-neutral-300">{createdModel?.id}</div>
                </div>
                <div>
                  <span className="text-neutral-500">Hash</span>
                  <div className="font-mono text-neutral-300 truncate">{createdModel?.model_hash?.slice(0, 24)}...</div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider">Upload Code File</label>
              <div className="mt-2 border-2 border-dashed border-white/10 p-8 text-center hover:border-[#00D4FF]/30 transition-colors">
                <input
                  type="file"
                  accept=".py,.ipynb,.json,.pt,.pth"
                  onChange={e => setFile(e.target.files[0])}
                  data-testid="file-upload-input"
                  className="hidden"
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="cursor-pointer">
                  <UploadSimple size={32} className="mx-auto mb-2 text-neutral-500" />
                  {file ? (
                    <div>
                      <div className="text-sm text-white">{file.name}</div>
                      <div className="text-xs text-neutral-500">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-neutral-400">Drop your model file here</div>
                      <div className="text-xs text-neutral-500 mt-1">.py, .ipynb, .json, .pt, .pth</div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
              <Code size={14} />
              File will be uploaded to IPFS via Pinata. No admin control over the process.
            </div>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              data-testid="upload-ipfs-button"
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              <UploadSimple size={16} weight="bold" />
              {loading ? 'Uploading to IPFS...' : 'Upload to IPFS'}
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="bg-[#0F0F0F] border border-white/10 p-6 text-center" data-testid="upload-success">
            <CheckCircle size={48} weight="duotone" className="text-emerald-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Model Submitted Successfully</h2>
            <p className="text-sm text-neutral-400 mb-6">Your model is now awaiting DAO governance approval. Community members will vote on it.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-6">
              <div className="p-3 bg-[#050505] border border-white/5">
                <span className="text-[10px] text-neutral-500">MODEL ID</span>
                <div className="font-mono text-xs text-white mt-1">{createdModel?.id}</div>
              </div>
              <div className="p-3 bg-[#050505] border border-white/5">
                <span className="text-[10px] text-neutral-500">STATUS</span>
                <div className="font-mono text-xs text-yellow-400 mt-1">PENDING VOTES</div>
              </div>
              {uploadResult?.ipfs?.cid && (
                <div className="p-3 bg-[#050505] border border-white/5 sm:col-span-2">
                  <span className="text-[10px] text-neutral-500">IPFS CID</span>
                  <div className="font-mono text-xs text-[#00D4FF] mt-1 break-all">{uploadResult.ipfs.cid}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setStep(1); setForm({ name: '', model_type: 'LSTM', strategy: '', description: '' }); setFile(null); }}
              data-testid="submit-another-button"
              className="px-6 py-2 bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-colors"
            >
              Submit Another Model
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
