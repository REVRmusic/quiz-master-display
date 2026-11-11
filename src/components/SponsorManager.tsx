import React, { useState, useRef } from 'react';
import { Sponsor, SponsorDisplayMode } from '../types';
import { DEFAULT_SPONSORS } from '../constants/defaultData';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Check, 
  Eye, 
  Repeat, 
  LayoutGrid, 
  Square,
  AlertCircle
} from 'lucide-react';

interface SponsorManagerProps {
  sponsors: Sponsor[];
  activeSponsorId: string;
  displayMode: SponsorDisplayMode;
  carouselSpeed: number;
  onUpdateSponsors: (sponsors: Sponsor[]) => void;
  onUpdateActiveSponsor: (id: string) => void;
  onUpdateDisplayMode: (mode: SponsorDisplayMode) => void;
  onUpdateCarouselSpeed: (speed: number) => void;
  onClose?: () => void;
}

export const SponsorManager: React.FC<SponsorManagerProps> = ({
  sponsors,
  activeSponsorId,
  displayMode,
  carouselSpeed,
  onUpdateSponsors,
  onUpdateActiveSponsor,
  onUpdateDisplayMode,
  onUpdateCarouselSpeed,
}) => {
  const [newSponsorName, setNewSponsorName] = useState('');
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload & compress to base64 for reliable localStorage storage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('L\'image est trop volumineuse (max 5 Mo).');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Optimize image size via canvas to save localStorage space if bitmap
      if (file.type !== 'image/svg+xml') {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const optimized = canvas.toDataURL('image/png', 0.9);
            setUploadedLogoUrl(optimized);
          } else {
            setUploadedLogoUrl(dataUrl);
          }
        };
        img.src = dataUrl;
      } else {
        setUploadedLogoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedLogoUrl) {
      setErrorMsg('Veuillez charger une image de logo.');
      return;
    }

    const name = newSponsorName.trim() || 'Sponsor Partenaire';
    const newSponsor: Sponsor = {
      id: `sponsor-${Date.now()}`,
      name,
      logoUrl: uploadedLogoUrl,
      enabled: true,
      order: sponsors.length,
    };

    const updated = [...sponsors, newSponsor];
    onUpdateSponsors(updated);
    onUpdateActiveSponsor(newSponsor.id);

    // Reset form
    setNewSponsorName('');
    setUploadedLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrorMsg(null);
  };

  const handleToggleSponsor = (id: string) => {
    const updated = sponsors.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onUpdateSponsors(updated);
  };

  const handleDeleteSponsor = (id: string) => {
    const updated = sponsors.filter((s) => s.id !== id);
    onUpdateSponsors(updated);
    if (activeSponsorId === id && updated.length > 0) {
      onUpdateActiveSponsor(updated[0].id);
    }
  };

  const handleRestoreDefault = () => {
    onUpdateSponsors(DEFAULT_SPONSORS);
    onUpdateActiveSponsor('balaruc-default');
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* SECTION 1: DISPLAY MODE CONFIGURATION */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Eye size={20} className="text-purple-400" />
          Mode d'affichage des Sponsors sur l'Écran Public
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Choisissez comment les logos de vos partenaires et du supermarché apparaissent en bas à droite de l'écran géant.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mode Single */}
          <button
            type="button"
            onClick={() => onUpdateDisplayMode('single')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
              displayMode === 'single'
                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Square size={20} className={displayMode === 'single' ? 'text-purple-400' : 'text-slate-400'} />
              {displayMode === 'single' && <Check size={18} className="text-purple-400" />}
            </div>
            <span className="font-bold text-sm text-white">Logo Unique Fixe</span>
            <span className="text-xs text-slate-400 mt-1">Affiche en continu le logo principal sélectionné ci-dessous.</span>
          </button>

          {/* Mode Carousel */}
          <button
            type="button"
            onClick={() => onUpdateDisplayMode('carousel')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
              displayMode === 'carousel'
                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Repeat size={20} className={displayMode === 'carousel' ? 'text-purple-400' : 'text-slate-400'} />
              {displayMode === 'carousel' && <Check size={18} className="text-purple-400" />}
            </div>
            <span className="font-bold text-sm text-white">Carrousel Tournant</span>
            <span className="text-xs text-slate-400 mt-1">Alterne en boucle automatique entre tous les logos activés.</span>
          </button>

          {/* Mode Grid / Multi-band */}
          <button
            type="button"
            onClick={() => onUpdateDisplayMode('grid')}
            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
              displayMode === 'grid'
                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <LayoutGrid size={20} className={displayMode === 'grid' ? 'text-purple-400' : 'text-slate-400'} />
              {displayMode === 'grid' && <Check size={18} className="text-purple-400" />}
            </div>
            <span className="font-bold text-sm text-white">Bandeau Multi-Logos</span>
            <span className="text-xs text-slate-400 mt-1">Affiche côte à côte l'ensemble des sponsors actifs.</span>
          </button>
        </div>

        {/* Carousel speed slider */}
        {displayMode === 'carousel' && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-300">
              Vitesse de rotation : <strong className="text-purple-400">{carouselSpeed} secondes</strong>
            </span>
            <input
              type="range"
              min="3"
              max="20"
              value={carouselSpeed}
              onChange={(e) => onUpdateCarouselSpeed(Number(e.target.value))}
              className="w-48 accent-purple-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* SECTION 2: ADD A NEW SPONSOR */}
      <form
        onSubmit={handleAddSponsor}
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
      >
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Upload size={20} className="text-emerald-400" />
          Ajouter un nouveau Logo de Sponsor / Partenaire
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nom de l'enseigne / Partenaire
            </label>
            <input
              type="text"
              placeholder="Ex: Centre Commercial, E.Leclerc, Optique 2000..."
              value={newSponsorName}
              onChange={(e) => setNewSponsorName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Image du Logo (PNG transparent ou JPEG)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/40 p-2.5 rounded-xl border border-rose-900">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Preview */}
        {uploadedLogoUrl && (
          <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="bg-white/95 p-2 rounded-lg flex items-center justify-center max-w-[180px] h-16 shadow">
              <img src={uploadedLogoUrl} alt="Aperçu" className="max-h-12 max-w-[160px] object-contain" />
            </div>
            <div className="flex-1 text-xs text-slate-400">
              <span className="font-semibold text-emerald-400 block mb-0.5">Image chargée avec succès</span>
              Prêt à être ajouté à votre liste de partenaires.
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-colors flex items-center gap-2"
            >
              <Check size={18} />
              Enregistrer ce Sponsor
            </button>
          </div>
        )}
      </form>

      {/* SECTION 3: SPONSORS LIST */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-amber-400" />
            Logos enregistrés ({sponsors.length})
          </h3>
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="text-xs text-slate-400 hover:text-purple-400 underline underline-offset-4"
          >
            Restaurer le logo Balaruc officiel
          </button>
        </div>

        <div className="space-y-3">
          {sponsors.map((sponsor) => {
            const isSelected = activeSponsorId === sponsor.id;

            return (
              <div
                key={sponsor.id}
                className={`flex items-center justify-between gap-4 p-3.5 rounded-2xl border transition-all ${
                  isSelected && displayMode === 'single'
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/40'
                    : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Logo thumbnail inside crisp white container (as it will appear on the big screen) */}
                <div className="bg-white p-1.5 px-3 rounded-xl flex items-center justify-center min-w-[120px] max-w-[140px] h-12 shadow-sm border border-slate-200">
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="max-h-10 max-w-[120px] object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{sponsor.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        sponsor.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-xs text-slate-400">
                      {sponsor.enabled ? 'Actif sur l\'écran' : 'Masqué'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Select as active in single mode */}
                  {displayMode === 'single' && (
                    <button
                      type="button"
                      onClick={() => onUpdateActiveSponsor(sponsor.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {isSelected ? 'Principal ✓' : 'Sélectionner'}
                    </button>
                  )}

                  {/* Toggle enable / disable */}
                  <button
                    type="button"
                    onClick={() => handleToggleSponsor(sponsor.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      sponsor.enabled
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {sponsor.enabled ? 'Activé' : 'Désactivé'}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(sponsor.id)}
                    disabled={sponsors.length <= 1}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Supprimer ce logo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
