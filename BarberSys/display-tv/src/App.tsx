import { useEffect, useMemo, useState } from 'react';
import { formatNomorAntrian, formatWIBClock } from './lib/announcement';
import { useDisplay } from './lib/use-display';
import { useSpeech } from './lib/use-speech';

const STATUS_LABEL: Record<string, string> = {
  dipanggil: 'DIPANGGIL',
  dilayani: 'DILAYANI',
  menunggu: 'MENUNGGU',
};

export default function App() {
  const { rows, connected } = useDisplay();
  const speech = useSpeech(rows);
  const [clock, setClock] = useState(() => formatWIBClock(new Date().toISOString()));

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock(formatWIBClock(new Date().toISOString())),
      1000
    );
    return () => window.clearInterval(timer);
  }, []);

  const latestCalled = useMemo(
    () =>
      rows
        .filter((row) => row.status === 'dipanggil' && row.called_at)
        .sort((a, b) => Date.parse(b.called_at!) - Date.parse(a.called_at!))[0] || null,
    [rows]
  );

  const ticker = rows.length
    ? rows
        .map(
          (row) =>
            `${formatNomorAntrian(row.nomor_antrian)} — ${STATUS_LABEL[row.status] || row.status}${
              row.barber_nama ? ` — ${row.barber_nama}` : ''
            }`
        )
        .join('   •   ')
    : 'Selamat datang di BarberSys — antrian sistem akan muncul di sini.';

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <div className="brand-name">BARBERSYS</div>
            <div className="brand-sub">DISPLAY ANTRIAN</div>
          </div>
        </div>
        <div className="clock-wrap">
          <div className="clock">{clock}</div>
          <div className="clock-zone">WIB · UTC+7</div>
        </div>
      </header>

      {latestCalled ? (
        <section className="call-banner" aria-live="polite">
          <div className="call-label">ANTRIAN DIPANGGIL</div>
          <div className="call-number">{formatNomorAntrian(latestCalled.nomor_antrian)}</div>
          <div className="call-detail">
            {latestCalled.kursi_nomor != null ? `Kursi ${latestCalled.kursi_nomor}` : 'Meja layanan'}
            {latestCalled.barber_nama ? ` · ${latestCalled.barber_nama}` : ''}
          </div>
        </section>
      ) : (
        <section className="call-banner idle">
          <div className="call-label">STATUS</div>
          <div className="call-number small">SIAP MELAYANI</div>
          <div className="call-detail">Menunggu panggilan berikutnya</div>
        </section>
      )}

      <section className="queue-section">
        <div className="section-head">
          <h2>ANTRIAN AKTIF</h2>
          <span className={connected ? 'dot live' : 'dot'}>
            {connected ? 'LIVE' : 'CONNECTING'}
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="empty">Belum ada antrian aktif.</div>
        ) : (
          <div className="queue-grid">
            {rows.map((row) => (
              <article key={row.queue_id} className={`queue-card ${row.status}`}>
                <div className="queue-number">{formatNomorAntrian(row.nomor_antrian)}</div>
                <div className="queue-status">{STATUS_LABEL[row.status] || row.status}</div>
                <div className="queue-barber">{row.barber_nama || 'Barber toko'}</div>
                {row.kursi_nomor != null ? (
                  <div className="queue-seat">Kursi {row.kursi_nomor}</div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="bottom">
        <div className="ticker">
          <span className="ticker-track">{ticker}</span>
        </div>
        <div className="controls">
          {speech.piperLoading ? (
            <span className="download-status">
              Mengunduh suara Indonesia… {speech.piperProgress}%
            </span>
          ) : null}
          {!speech.enabled ? (
            <button type="button" onClick={speech.activate}>
              Aktifkan Suara
            </button>
          ) : null}
          <button type="button" onClick={speech.testVoice} disabled={!speech.enabled}>
            Tes Suara
          </button>
          <select
            aria-label="Mesin suara"
            value={speech.preferred}
            onChange={(event) =>
              speech.setPreferred(event.target.value as 'piper' | 'browser')
            }
          >
            <option value="piper">Piper Indonesia (lokal)</option>
            <option value="browser">Suara Browser</option>
          </select>
          {speech.preferred === 'browser' ? (
            <select
              aria-label="Pilih suara browser"
              value={speech.voiceUri || ''}
              onChange={(event) => speech.setVoiceUri(event.target.value || null)}
            >
              <option value="">Suara default (id-ID)</option>
              {speech.voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </footer>

      {speech.warning ? (
        <div className="voice-warning" role="alert">
          <strong>Suara Indonesia belum siap.</strong>{' '}
          {speech.piperError || speech.piperLoading
            ? 'Model Piper sedang diunduh atau gagal dimuat; pengumuman sementara memakai suara browser.'
            : 'Pasang voice Bahasa Indonesia di perangkat, atau biarkan Piper mengunduh modelnya saat tombol Aktifkan Suara ditekan.'}
        </div>
      ) : null}
    </div>
  );
}
