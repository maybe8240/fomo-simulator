import { useEffect, useState } from 'react';
import type { Ending, GameState } from '../engine/types';
import { translate } from '../i18n';
import type { Locale } from '../i18n';
import { createRunImage, downloadRunImage } from '../services/share';

export default function ShareRun({ state, ending, locale }: { state: GameState; ending: Ending; locale: Locale }) {
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState('preparing_share');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setImage(null);
    setStatus('preparing_share');
    void createRunImage(state, ending, locale).then(file => {
      if (active) { setImage(file); setStatus(''); }
    }).catch(() => { if (active) setStatus('share_error'); });
    return () => { active = false; };
  }, [state, ending, locale, attempt]);
  return <div className="share-run">
    <button className="restart-button" type="button" disabled={busy || (!image && status !== 'share_error')}
      onClick={() => {
        if (!image) { setAttempt(value => value + 1); return; }
        setBusy(true);
        try {
          downloadRunImage(image);
          setStatus('share_downloaded');
        } catch { setStatus('share_error'); }
        finally { setBusy(false); }
      }}>{translate(locale, 'share_run')}</button>
    {status && <p role="status">{translate(locale, status)}</p>}
  </div>;
}
