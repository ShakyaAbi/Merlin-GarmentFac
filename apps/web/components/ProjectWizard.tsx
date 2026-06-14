
import React, { useState } from 'react';
import { Project, NodeType, LogframeNode } from '../types';
import { Button } from './ui/Button';
import { ChevronRight, Check, Calendar, FileText, Target, Layers } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface ProjectWizardProps {
  onClose: () => void;
}

// Reusing stepper logic (could be extracted to a shared component)
const WizardStepper = ({ steps, currentStep }: { steps: string[], currentStep: number }) => {
  return (
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}
                `}>
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`ml-3 text-sm font-medium hidden sm:block ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                  {step}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const steps = ['Profile', 'Timeline', 'Strategy', 'Review'];

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'Draft',
    sectors: [],
    location: '',
    donor: '',
    budgetAmount: undefined,
    budgetCurrency: '',
    logframe: [] // We will build a basic goal here
  });

  // Helper for the strategy step
  const [primaryGoal, setPrimaryGoal] = useState<Partial<LogframeNode>>({
    title: '',
    description: '',
    type: NodeType.GOAL
  });
  const [newSector, setNewSector] = useState('');

  const updateField = (field: keyof Project, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSector = () => {
    const trimmed = newSector.trim();
    if (!trimmed) return;
    const next = [...(formData.sectors || [])];
    if (!next.includes(trimmed)) next.push(trimmed);
    updateField('sectors', next);
    setNewSector('');
  };

  const removeSector = (index: number) => {
    updateField('sectors', (formData.sectors || []).filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Construct the initial logframe with the primary goal
      const initialLogframe: LogframeNode[] = primaryGoal.title ? [{
        id: `goal-${Date.now()}`,
        type: NodeType.GOAL,
        title: primaryGoal.title,
        description: primaryGoal.description,
        children: [],
        indicatorCount: 0
      }] : [];

      const normalizedLocation = formData.location?.trim();
      const normalizedDonor = formData.donor?.trim();
      const normalizedCurrency = formData.budgetCurrency?.trim();
      const normalizedSectors = (formData.sectors || []).map((s) => s.trim()).filter(Boolean);

      const newProjectData = {
        ...formData,
        sectors: normalizedSectors,
        location: normalizedLocation || undefined,
        donor: normalizedDonor || undefined,
        budgetCurrency: normalizedCurrency || undefined,
        logframe: initialLogframe
      };

      const newProject = await api.createProject(newProjectData);
      onClose();
      // Redirect to the new project
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return !!formData.name && formData.name.length > 3;
      case 1: return !!formData.startDate && !!formData.endDate && new Date(formData.startDate) <= new Date(formData.endDate);
      case 2: return !!primaryGoal.title; // Require at least a goal title
      default: return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Profile
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Project Profile</h2>
            <p className="text-slate-500 mb-6">Let's start with the basics. What is this intervention about?</p>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name <span className="text-red-500">*</span></label>
              <input 
                type="text"
                value={formData.name || ''}
                onChange={e => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                placeholder="e.g. Sustainable Agriculture in Northern District"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                rows={5}
                value={formData.description || ''}
                onChange={e => updateField('description', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                placeholder="Describe the project's background, objectives, and scope."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sectors</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSector();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  placeholder="Add a sector and press Enter"
                />
                <Button type="button" onClick={addSector}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.sectors || []).map((sector, idx) => (
                  <span key={`${sector}-${idx}`} className="bg-white border border-slate-200 px-2 py-1 rounded-md text-sm flex items-center">
                    {sector}
                    <button
                      type="button"
                      onClick={() => removeSector(idx)}
                      className="ml-2 text-slate-400 hover:text-red-500"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {(!formData.sectors || formData.sectors.length === 0) && (
                  <span className="text-sm text-slate-400 italic">No sectors added yet.</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Region / Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={e => updateField('location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                placeholder="e.g. Province 3, Kathmandu Valley"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Donor (Optional)</label>
              <input
                type="text"
                value={formData.donor || ''}
                onChange={e => updateField('donor', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                placeholder="e.g. USAID"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget Amount</label>
                <input
                  type="number"
                  value={formData.budgetAmount ?? ''}
                  onChange={e => {
                    const raw = e.target.value;
                    const parsed = raw === '' ? undefined : Number(raw);
                    updateField('budgetAmount', Number.isFinite(parsed as number) ? parsed : undefined);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  placeholder="e.g. 250000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget Currency</label>
                <input
                  type="text"
                  value={formData.budgetCurrency || ''}
                  onChange={e => updateField('budgetCurrency', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  placeholder="e.g. NPR"
                />
              </div>
            </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                    value={formData.status}
                    onChange={e => updateField('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                >
                    <option value="Draft">Draft (Planning Phase)</option>
                    <option value="Active">Active (Implementation)</option>
                </select>
            </div>
          </div>
        );

      case 1: // Timeline
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Timeline</h2>
            <p className="text-slate-500 mb-6">Define the implementation period.</p>

            <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date"
                    value={formData.startDate || ''}
                    onChange={e => updateField('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date"
                    value={formData.endDate || ''}
                    onChange={e => updateField('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  />
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-blue-900 text-sm">Automated Reporting Periods</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Based on these dates, the system will automatically generate weekly and monthly reporting periods for your indicators.
                    </p>
                </div>
            </div>
          </div>
        );

      case 2: // Strategy (Initial Goal)
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Strategic Goal</h2>
            <p className="text-slate-500 mb-6">Every project starts with a primary goal. Define your top-level Impact or Goal.</p>

            <div className="bg-white border-2 border-purple-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Goal</span>
                    <span className="text-slate-400 text-sm">Top Level Node</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Goal Statement <span className="text-red-500">*</span></label>
                        <input 
                            type="text"
                            value={primaryGoal.title || ''}
                            onChange={e => setPrimaryGoal(prev => ({...prev, title: e.target.value}))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-900 font-medium"
                            placeholder="e.g. Increase sustainable income for rural farmers"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description / Theory of Change</label>
                        <textarea 
                            rows={3}
                            value={primaryGoal.description || ''}
                            onChange={e => setPrimaryGoal(prev => ({...prev, description: e.target.value}))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-900"
                            placeholder="Briefly explain what this goal achieves..."
                        />
                    </div>
                </div>
            </div>
            
            <p className="text-sm text-slate-500 italic text-center">
                You can add detailed Outcomes, Outputs, and Activities later in the Logframe Builder.
            </p>
          </div>
        );

      case 3: // Review
        return (
          <div className="max-w-2xl mx-auto space-y-6">
             <h2 className="text-2xl font-bold text-slate-900 mb-6">Review Project Details</h2>

             <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-semibold text-slate-700 flex items-center"><FileText className="w-4 h-4 mr-2" /> Profile</h3>
                       <button onClick={() => setStep(0)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div className="p-4 space-y-2">
                       <div><span className="text-slate-500 text-sm">Name:</span> <span className="font-bold text-slate-900 block">{formData.name}</span></div>
                       <div><span className="text-slate-500 text-sm">Status:</span> <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">{formData.status}</span></div>
                       <p className="text-sm text-slate-600 mt-2">{formData.description}</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-semibold text-slate-700 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Timeline</h3>
                       <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <div><span className="text-slate-500 text-sm">Start Date</span> <span className="block font-medium">{formData.startDate}</span></div>
                        <div><span className="text-slate-500 text-sm">End Date</span> <span className="block font-medium">{formData.endDate}</span></div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-semibold text-slate-700 flex items-center"><Layers className="w-4 h-4 mr-2" /> Additional Details</h3>
                       <button onClick={() => setStep(0)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                        <div>
                          <span className="text-slate-500">Sectors:</span>{' '}
                          <span className="font-medium">{(formData.sectors || []).join(', ') || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Location:</span>{' '}
                          <span className="font-medium">{formData.location || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Donor:</span>{' '}
                          <span className="font-medium">{formData.donor || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Budget:</span>{' '}
                          <span className="font-medium">
                            {formData.budgetAmount ?? '—'} {formData.budgetCurrency || ''}
                          </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="font-semibold text-slate-700 flex items-center"><Target className="w-4 h-4 mr-2" /> Primary Goal</h3>
                       <button onClick={() => setStep(2)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </div>
                    <div className="p-4">
                        <span className="block font-bold text-slate-900 text-lg mb-1">{primaryGoal.title}</span>
                        <p className="text-sm text-slate-600">{primaryGoal.description}</p>
                    </div>
                </div>
             </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white pt-6 pb-2">
        <h1 className="text-2xl font-bold text-center text-slate-900">Create New Project</h1>
        <p className="text-center text-slate-500 mt-1">Define your intervention logic and parameters</p>
      </div>

      <WizardStepper steps={steps} currentStep={step} />

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {renderStepContent()}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext} 
            disabled={!isStepValid() || isSubmitting}
            isLoading={isSubmitting}
            className="min-w-[120px]"
          >
            {step === steps.length - 1 ? 'Create Project' : 'Next'} 
            {step !== steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
