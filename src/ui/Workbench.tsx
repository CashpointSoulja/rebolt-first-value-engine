import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clipboard, Database,
  FileCheck2, FileText, FlaskConical, Info, Link2, LockKeyhole, RotateCcw,
  SlidersHorizontal, Upload, XCircle,
} from 'lucide-react';
import { EVENT_HEADERS, importDataset, MAX_BYTES, MAX_ROWS, SIGNUP_HEADERS } from '../domain/dataset';
import { analyze, validateSettings } from '../domain/metrics';
import { invalidExampleCsv, loadSample, sampleCsv } from '../domain/sample';
import { buildUTM, exportPlan, rankExperiments, safeCsvCell } from '../domain/tools';
import { CHANNELS, DEFAULT_SETTINGS, SEGMENTS } from '../domain/types';
import type {
  Dataset, Experiment, ImportResult, MetricSettings, PlanInput, RowPartition,
  SegmentResult, UTMInput, UTMResult, ValidationReport,
} from '../domain/types';
import './styles.css';

type CsvTable = 'signups' | 'events';
type ActiveState = { dataset: Dataset; settings: MetricSettings };
type SettingsDraft = Omit<MetricSettings, 'windowDays'> & { windowDays: string };
type Notice = { kind: 'neutral' | 'success' | 'error'; text: string };

const EMPTY_PLAN: PlanInput = {
  owner: '', hypothesis: '', guardrails: '', stopCriteria: '', successCriteria: '',
};
const INITIAL_UTM: UTMInput = {
  destination: 'https://example.com/start', source: 'synthetic',
  medium: 'email', campaign: 'first_value_demo', content: '', term: '',
};
const TABLES: CsvTable[] = ['signups', 'events'];
const NUMBER = new Intl.NumberFormat('en-US');
const percent = (value: number | null) => value === null ? 'Not estimable' : `${(value * 100).toFixed(1)}%`;
const count = (value: number) => NUMBER.format(value);
const words = (value: string) => value.replaceAll('_', ' ');
const settingsDraft = (settings: MetricSettings): SettingsDraft => ({
  ...settings, windowDays: String(settings.windowDays),
});
const emptyPartition = (): RowPartition => ({ received: 0, accepted: 0, duplicates: 0, quarantined: 0 });
const emptyDataset = (): Dataset => ({
  id: 'synthetic-empty', label: 'Empty dataset', signups: [], events: [],
  uncertainAccountIds: [], conflictingSignupIds: [],
  report: { signups: emptyPartition(), events: emptyPartition(), issues: [], fatalErrors: [] },
});

function download(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function NoticeBox({ notice }: { notice: Notice }) {
  const Icon = notice.kind === 'error' ? XCircle : notice.kind === 'success' ? CheckCircle2 : Info;
  return (
    <div className={`notice notice--${notice.kind}`}>
      <Icon size={18} aria-hidden="true" />
      <p>{notice.text}</p>
    </div>
  );
}

function SectionHeading({ id, number, eyebrow, title, description }: {
  id: string; number: string; eyebrow: string; title: string; description: string;
}) {
  return (
    <div className="section-heading">
      <div className="section-marker" aria-hidden="true">{number}</div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p className="section-description">{description}</p>
      </div>
    </div>
  );
}

function PartitionTable({ report, label }: { report: ValidationReport; label: string }) {
  return (
    <div className="table-scroll" role="region" tabIndex={0} aria-label={label}>
      <table className="data-table partition-table">
        <caption className="sr-only">{label}. Received equals accepted plus duplicates plus quarantined.</caption>
        <thead><tr><th scope="col">Table</th><th scope="col">Received</th><th scope="col">Accepted</th><th scope="col">Duplicates</th><th scope="col">Quarantined</th></tr></thead>
        <tbody>
          {TABLES.map((table) => (
            <tr key={table}>
              <th scope="row" className="capitalize">{table}</th>
              <td>{count(report[table].received)}</td><td>{count(report[table].accepted)}</td>
              <td>{count(report[table].duplicates)}</td><td>{count(report[table].quarantined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationPanel({ result, onApply }: { result: ImportResult; onApply: () => void }) {
  const canApply = result.ok && result.candidate !== null;
  return (
    <div className="validation-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Draft only · not active</p>
          <h4>{canApply ? 'Validated. Ready for your review.' : 'Draft blocked. Active data preserved.'}</h4>
        </div>
        {canApply ? <FileCheck2 size={24} aria-hidden="true" /> : <XCircle size={24} aria-hidden="true" />}
      </div>
      <p className="muted small">
        Received = accepted + duplicates + quarantined, in each table.
        {' '}{canApply ? 'Review these counts, then explicitly apply this dataset.' : 'No dataset or metric settings have changed. Correct the draft and validate again.'}
      </p>
      <PartitionTable report={result.report} label="Validation-only row accounting" />
      {result.report.fatalErrors.length > 0 && (
        <ul className="error-list">{result.report.fatalErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>
      )}
      {result.report.issues.length > 0 && (
        <details className="inline-details" open={!canApply}>
          <summary>Row diagnostics ({result.report.issues.length}) <ChevronDown size={16} aria-hidden="true" /></summary>
          <ul className="issue-list">
            {result.report.issues.slice(0, 100).map((issue, index) => (
              <li key={`${issue.table}-${issue.row}-${index}`}>
                <span className="issue-location">{issue.table} · row {issue.row} · {issue.severity}</span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
          {result.report.issues.length > 100 && <p className="small muted">Showing the first 100 diagnostics of {result.report.issues.length}. All issues still block or qualify this draft as reported above.</p>}
        </details>
      )}
      {result.candidate && (
        <p className="small muted">
          Diagnostic candidate: {count(result.candidate.signups.length)} signup units, {count(result.candidate.events.length)} accepted events;
          {' '}{count(result.candidate.uncertainAccountIds.length)} units flagged uncertain and {count(result.candidate.conflictingSignupIds.length)} conflicting signup IDs.
          {!canApply && ' This quarantined candidate is never used for active analysis.'}
        </p>
      )}
      {canApply && <button className="button button--amber" type="button" onClick={onApply}>Apply validated dataset <ArrowRight size={17} aria-hidden="true" /></button>}
    </div>
  );
}

function BreakdownTable({ rows, dimension }: { rows: SegmentResult[]; dimension: string }) {
  return (
    <div className="table-scroll" role="region" tabIndex={0} aria-label={`${dimension} breakdown; scroll horizontally if needed`}>
      <table className="data-table breakdown-table">
        <caption className="sr-only">{dimension} breakdown using frozen signup-time attributes; N confirmed, D mature, U unknown, F known non-converters.</caption>
        <thead><tr>
          <th scope="col">{dimension}</th><th scope="col">N / D / U</th><th scope="col">F</th>
          <th scope="col">Coverage (D−U) / D</th><th scope="col">Outcome bounds</th><th scope="col">Pending</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="capitalize">{words(row.label)}</th>
              <td className="tabular">{count(row.N)} / {count(row.D)} / {count(row.U)}</td>
              <td>{count(row.F)}</td>
              <td>{percent(row.coverage)}<span className="cell-note">{row.D - row.U} / {row.D}</span></td>
              <td>{row.D === 0 ? 'Not estimable' : `${percent(row.lower)}–${percent(row.upper)}`}
                <span className="cell-note">{row.N} / {row.D} to {row.N + row.U} / {row.D}</span>
              </td>
              <td>{count(row.pending)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="table-empty">No units in this view. Unknown categories remain part of the accounting when present.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function Workbench() {
  const [active, setActive] = useState<ActiveState>(() => ({ dataset: emptyDataset(), settings: { ...DEFAULT_SETTINGS } }));
  const [draftSettings, setDraftSettings] = useState<SettingsDraft>(() => settingsDraft(DEFAULT_SETTINGS));
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [csv, setCsv] = useState({ signups: '', events: '' });
  const [fileErrors, setFileErrors] = useState({ signups: '', events: '' });
  const [reading, setReading] = useState({ signups: false, events: false });
  const [fileInputKey, setFileInputKey] = useState(0);
  const readVersion = useRef({ signups: 0, events: 0 });
  const [validation, setValidation] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState<Notice>({ kind: 'neutral', text: 'Your session is empty. Load the synthetic sample or validate your own synthetic CSVs to begin.' });
  const [breakdown, setBreakdown] = useState<'segments' | 'channels'>('segments');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanInput>({ ...EMPTY_PLAN });
  const [planErrors, setPlanErrors] = useState<string[]>([]);
  const [utmInput, setUtmInput] = useState<UTMInput>({ ...INITIAL_UTM });
  const [utmResult, setUtmResult] = useState<UTMResult | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const analysis = useMemo(() => analyze(active.dataset, active.settings), [active]);
  const experiments = useMemo(() => rankExperiments(analysis), [analysis]);
  const selected = experiments.find((experiment) => experiment.id === selectedId);
  const hasData = active.dataset.signups.length > 0;
  const isReading = reading.signups || reading.events;
  const hasFileError = Boolean(fileErrors.signups || fileErrors.events);
  const population = analysis.population;
  const partitionSum = population.outOfCohort + population.excluded + population.eligibilityUnknown
    + population.mature + population.pending + population.maturityUnknown;
  const selectedRows = analysis[breakdown];

  function resetPlan() {
    setSelectedId(null);
    setPlan({ ...EMPTY_PLAN });
    setPlanErrors([]);
  }

  function resetImportDraft() {
    readVersion.current.signups += 1;
    readVersion.current.events += 1;
    setCsv({ signups: '', events: '' });
    setFileErrors({ signups: '', events: '' });
    setReading({ signups: false, events: false });
    setValidation(null);
    setFileInputKey((key) => key + 1);
  }

  function useSample() {
    try {
      const dataset = loadSample();
      setActive({ dataset, settings: { ...DEFAULT_SETTINGS } });
      setDraftSettings(settingsDraft(DEFAULT_SETTINGS));
      setSettingsErrors([]);
      resetImportDraft();
      resetPlan();
      setNotice({ kind: 'success', text: 'Synthetic sample loaded. Dataset and demonstration settings were applied together. No real customer data or performance is represented.' });
    } catch {
      setNotice({ kind: 'error', text: 'The synthetic sample could not be loaded. Your active dataset and settings are unchanged.' });
    }
  }

  function clearDataset() {
    setActive({ dataset: emptyDataset(), settings: { ...DEFAULT_SETTINGS } });
    setDraftSettings(settingsDraft(DEFAULT_SETTINGS));
    setSettingsErrors([]);
    resetImportDraft();
    resetPlan();
    setUtmInput({ ...INITIAL_UTM });
    setUtmResult(null);
    setCopyMessage('');
    setNotice({ kind: 'neutral', text: 'Dataset, drafts and plan cleared. Demonstration settings restored together. No file contents are persisted by this workbench.' });
  }

  function editCsv(table: CsvTable, text: string) {
    readVersion.current[table] += 1;
    setReading((current) => ({ ...current, [table]: false }));
    setValidation(null);
    if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
      setCsv((current) => ({ ...current, [table]: '' }));
      setFileErrors((current) => ({ ...current, [table]: `Pasted text exceeds the ${count(MAX_BYTES)}-byte limit. The draft was rejected, not truncated. Paste a smaller synthetic CSV.` }));
      return;
    }
    setFileErrors((current) => ({ ...current, [table]: '' }));
    setCsv((current) => ({ ...current, [table]: text }));
  }

  async function readFile(table: CsvTable, file?: File) {
    if (!file) return;
    const version = ++readVersion.current[table];
    setValidation(null);
    setCsv((current) => ({ ...current, [table]: '' }));
    setFileErrors((current) => ({ ...current, [table]: '' }));
    setReading((current) => ({ ...current, [table]: false }));
    if (file.size > MAX_BYTES) {
      setFileErrors((current) => ({ ...current, [table]: `File exceeds the ${count(MAX_BYTES)}-byte limit. Choose a smaller synthetic CSV. It has not been read.` }));
      return;
    }
    setReading((current) => ({ ...current, [table]: true }));
    try {
      const text = await file.text();
      if (readVersion.current[table] !== version) return;
      setCsv((current) => ({ ...current, [table]: text }));
    } catch {
      if (readVersion.current[table] !== version) return;
      setFileErrors((current) => ({ ...current, [table]: 'This file could not be read. Choose it again or use the paste field. Active data is unchanged.' }));
    } finally {
      if (readVersion.current[table] === version) setReading((current) => ({ ...current, [table]: false }));
    }
  }

  function validateDraft() {
    if (isReading || hasFileError) return;
    try {
      const result = importDataset(csv.signups, csv.events);
      setValidation(result);
      setNotice({
        kind: result.ok ? 'neutral' : 'error',
        text: result.ok
          ? 'Draft validated, not applied. Review the validation-only report and choose Apply validated dataset to change the active analysis.'
          : 'Draft blocked. The active dataset and metric settings are unchanged; diagnostic candidates are not used for analysis.',
      });
    } catch {
      setValidation(null);
      setNotice({ kind: 'error', text: 'The draft could not be validated. Active data and metric settings are unchanged. Check the CSV templates and try again.' });
    }
  }

  function applyDataset() {
    if (!validation?.ok || !validation.candidate || isReading || hasFileError) return;
    setActive((current) => ({ dataset: validation.candidate!, settings: current.settings }));
    setValidation(null);
    resetPlan();
    setNotice({ kind: 'success', text: 'Validated synthetic dataset applied. Active metric settings were preserved. Experiment selection was cleared so the next plan uses this analysis.' });
  }

  function applySettings() {
    const candidate: MetricSettings = { ...draftSettings, windowDays: Number(draftSettings.windowDays) };
    const errors = validateSettings(candidate);
    setSettingsErrors(errors);
    if (errors.length > 0) {
      setNotice({ kind: 'error', text: 'Settings draft is invalid. Active settings, dataset and metrics are unchanged.' });
      return;
    }
    setActive((current) => ({ dataset: current.dataset, settings: candidate }));
    resetPlan();
    setNotice({ kind: 'success', text: 'Measurement settings applied together. The dataset is unchanged. Experiment selection was cleared for review against the new cohort.' });
  }

  function setSetting<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setDraftSettings((current) => ({ ...current, [key]: value }));
    setSettingsErrors([]);
  }

  function prepareInvalidDraft() {
    resetImportDraft();
    setCsv(invalidExampleCsv());
    setNotice({ kind: 'neutral', text: 'An intentionally invalid synthetic example is in the draft fields. Choose Validate draft to inspect its issues. Active data and settings are unchanged.' });
  }

  function downloadCsv(table: CsvTable, template = false) {
    const headers = table === 'signups' ? SIGNUP_HEADERS : EVENT_HEADERS;
    const content = template ? `${headers.map(safeCsvCell).join(',')}\r\n` : sampleCsv()[table];
    download(content, `first-value-${template ? 'template' : 'synthetic-sample'}-${table}.csv`, 'text/csv;charset=utf-8');
  }

  function selectExperiment(experiment: Experiment) {
    if (selectedId === experiment.id) return;
    setSelectedId(experiment.id);
    setPlan({
      owner: 'Synthetic growth owner', hypothesis: experiment.hypothesis,
      guardrails: experiment.guardrails, stopCriteria: experiment.stopCriteria,
      successCriteria: experiment.successCriteria,
    });
    setPlanErrors([]);
    setNotice({ kind: 'neutral', text: 'Experiment selected. Its hypothesis and criteria now initialize the plan; selecting a different experiment replaces those draft fields.' });
  }

  function editUTM<K extends keyof UTMInput>(key: K, value: UTMInput[K]) {
    setUtmInput((current) => ({ ...current, [key]: value }));
    setUtmResult(null);
    setCopyMessage('');
    setPlanErrors([]);
  }

  function constructUTM() {
    setUtmResult(buildUTM(utmInput));
    setCopyMessage('');
    setPlanErrors([]);
  }

  async function copyUTM() {
    if (!utmResult?.ok) return;
    try {
      await navigator.clipboard.writeText(utmResult.url);
      setCopyMessage('Constructed URL copied. No destination was visited.');
    } catch {
      setCopyMessage('Clipboard unavailable. Select and copy the read-only URL manually.');
    }
  }

  function downloadPlan(format: 'json' | 'csv') {
    if (!selected || !hasData) return;
    const identifiers = [...new Set([
      active.dataset.id,
      ...active.dataset.signups.map((signup) => signup.accountId),
      ...active.dataset.events.flatMap((event) => [event.accountId, event.eventId]),
      ...active.dataset.uncertainAccountIds, ...active.dataset.conflictingSignupIds,
    ])];
    const input: PlanInput = { ...plan, ...(utmResult?.ok ? { campaignUrl: utmResult.url } : {}) };
    const result = exportPlan(analysis, active.settings, selected, input, identifiers);
    setPlanErrors(result.errors);
    if (!result.ok) return;
    download(result[format], `first-value-synthetic-plan.${format}`, format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8');
    setNotice({ kind: 'success', text: `${format.toUpperCase()} plan download prepared locally. It is a synthetic experiment proposal, not a campaign launch or completed action.` });
  }

  return (
    <div className="workbench">
      <a className="skip-link" href="#main">Skip to workbench</a>
      <header className="site-header">
        <a className="product-name" href="#main"><BarChart3 size={22} aria-hidden="true" /><span>First Value Engine<span className="product-subtitle">Independent experiment workbench</span></span></a>
        <nav aria-label="Workbench workflow" className="workflow-nav">
          <a href="#data"><span>01</span> Overview / data</a>
          <a href="#cohorts"><span>02</span> Cohorts & path</a>
          <a href="#experiments"><span>03</span> Experiment lab</a>
          <a href="#plan"><span>04</span> Campaign + plan</a>
        </nav>
        <span className="session-indicator"><span aria-hidden="true" />Local session</span>
      </header>

      <main id="main" className="page-shell" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-eyebrow"><span className="status-label">Synthetic data</span><span>Clarity before the next experiment.</span></div>
            <h1 id="hero-title">FROM SIGNUP.<br /><span>TO FIRST VALUE.</span></h1>
            <p className="hero-description">Understand the journey. Keep the unknowns.<br className="desktop-break" /> Turn a synthetic cohort into a considered next experiment.</p>
            <p className="independence">Independent concept by Ayo Ahmed <span aria-hidden="true">·</span> Not affiliated with Rebolt</p>
          </div>
          <div className="hero-action">
            <p className="eyebrow">A small dataset. A complete workflow.</p>
            <button type="button" className="sample-cta" onClick={useSample}>
              <ArrowUpRight size={32} aria-hidden="true" />
              <span>Load synthetic<br />sample</span>
              <span className="cta-footnote">Explore locally. Nothing connects.</span>
              <span className="hazard-stripe" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</span>
            </button>
            <a className="text-link" href="#data">Or bring synthetic CSVs <ArrowDown size={15} aria-hidden="true" /></a>
            <div className="source-cue"><span>Source-brand reference</span><img src="/assets/rebolt-wordmark-white.svg" width="79" height="24" alt="Rebolt" /></div>
          </div>
        </section>

        <div className="principles-strip">
          <span><LockKeyhole size={16} aria-hidden="true" />Local-only data</span>
          <span><CircleHelp size={16} aria-hidden="true" />Unknown is not failure</span>
          <span><FlaskConical size={16} aria-hidden="true" />Hypotheses, not performance claims</span>
        </div>
        <div className="session-message" role="status" aria-live="polite" aria-atomic="true"><NoticeBox notice={notice} /></div>

        <section id="data" className="workflow-section" aria-labelledby="data-heading">
          <SectionHeading id="data-heading" number="01" eyebrow="Overview / data" title="Start with a known foundation." description="Two synthetic CSVs. One explicit commit. Your active dataset stays separate from every unvalidated draft." />
          <div className="dataset-summary">
            <div className="dataset-identity"><Database size={26} aria-hidden="true" /><div><span className="eyebrow">Active dataset</span><h3>{hasData ? 'Synthetic dataset ready' : 'No dataset loaded'}</h3><p>{hasData ? `${count(active.dataset.signups.length)} signup units · ${count(active.dataset.events.length)} events in this session` : 'An honest empty state. No sample is loaded automatically.'}</p></div></div>
            <div className="button-row">
              <button type="button" className="button button--outline" onClick={useSample}><Database size={16} aria-hidden="true" />Load synthetic sample</button>
              <button type="button" className="button button--quiet" onClick={clearDataset}><RotateCcw size={15} aria-hidden="true" />Clear session</button>
            </div>
          </div>
          {hasData && (
            <details className="inline-details active-accounting">
              <summary>Active dataset row accounting <ChevronDown size={16} aria-hidden="true" /></summary>
              <PartitionTable report={active.dataset.report} label="Active dataset row accounting" />
              <p className="small muted">Received = accepted + exact duplicates + quarantined. Import errors cannot be committed.</p>
            </details>
          )}

          <div className="panel import-panel">
            <div className="panel-heading"><div><p className="eyebrow">Local import workspace</p><h3>Validate first. Apply second.</h3></div><Upload size={21} aria-hidden="true" /></div>
            <div className="privacy-line"><LockKeyhole size={16} aria-hidden="true" /><p>Synthetic data only. CSV contents stay in this tab’s memory: no network upload, browser storage or integration. Reloading ends the session. Do not enter private data, contact details or secrets.</p></div>
            <div className="import-grid">
              {TABLES.map((table, index) => (
                <div className="file-panel" key={table}>
                  <div className="file-panel-title"><span className="mini-number">0{index + 1}</span><h4 className="capitalize">{table} CSV</h4><FileText size={18} aria-hidden="true" /></div>
                  <label className="field-label" htmlFor={`${table}-file`}>Choose a synthetic {table} file</label>
                  <input key={`${table}-${fileInputKey}`} type="file" id={`${table}-file`} accept=".csv,text/csv" onChange={(event) => { void readFile(table, event.target.files?.[0]); }} aria-describedby={`${table}-limits ${table}-file-status`} aria-invalid={Boolean(fileErrors[table])} />
                  <p id={`${table}-limits`} className="field-hint">Up to {count(MAX_BYTES)} bytes and {count(MAX_ROWS)} rows per file. No extra columns.</p>
                  <div id={`${table}-file-status`} role="status" className={fileErrors[table] ? 'field-error' : 'field-hint'}>
                    {reading[table] ? 'Reading locally…' : fileErrors[table] || (csv[table] ? 'Draft text is ready for validation.' : 'No draft text yet.')}
                  </div>
                  <div className="download-links">
                    <button type="button" className="text-button" onClick={() => downloadCsv(table, true)}><ArrowDownToLine size={14} aria-hidden="true" />Blank template</button>
                    <button type="button" className="text-button" onClick={() => downloadCsv(table)}><ArrowDownToLine size={14} aria-hidden="true" />Synthetic sample</button>
                  </div>
                  <details className="inline-details paste-details">
                    <summary>Paste or inspect draft CSV <ChevronDown size={16} aria-hidden="true" /></summary>
                    <label htmlFor={`${table}-paste`} className="field-label">Synthetic {table} CSV text</label>
                    <textarea id={`${table}-paste`} className="csv-textarea" rows={6} spellCheck={false} autoComplete="off" value={csv[table]} onChange={(event) => editCsv(table, event.target.value)} aria-describedby={`${table}-headers ${table}-file-status`} aria-invalid={Boolean(fileErrors[table])} placeholder={(table === 'signups' ? SIGNUP_HEADERS : EVENT_HEADERS).join(',')} />
                    <p id={`${table}-headers`} className="field-hint"><strong>Exact headers:</strong> <code>{(table === 'signups' ? SIGNUP_HEADERS : EVENT_HEADERS).join(',')}</code></p>
                  </details>
                </div>
              ))}
            </div>
            <details className="inline-details schema-details">
              <summary>Accepted synthetic schema & evidence <ChevronDown size={16} aria-hidden="true" /></summary>
              <div className="schema-grid">
                <p><strong>Identifiers</strong><br /><code>syn_[A-Za-z0-9_-]+</code> for accounts; <code>evt_[A-Za-z0-9_-]+</code> for events. Timestamps require RFC3339 with timezone. All values are synthetic.</p>
                <p><strong>Signup categories</strong><br />Segments: {SEGMENTS.join(', ')}. Channels: {CHANNELS.join(', ')}. Eligibility: eligible, excluded, unknown. Coverage: complete, unknown. Blank categories mean unknown.</p>
                <p><strong>Event categories</strong><br />qualified_lead, pilot_setup, first_use, first_value_verified. result_complete is true, false or blank (false). No arbitrary free text or extra columns.</p>
                <p><strong>Hypothetical value evidence</strong><br />time_saved, rework_reduced or outcome_confirmed, or blank. These are categories, not measured quantities. Verification requires a true completion result and nonblank qualifying evidence.</p>
              </div>
            </details>
            <div className="import-actions">
              <button type="button" className="button button--amber" onClick={validateDraft} disabled={isReading || hasFileError}><FileCheck2 size={17} aria-hidden="true" />{isReading ? 'Reading files…' : 'Validate draft'}</button>
              <button type="button" className="text-button" onClick={prepareInvalidDraft}>Try an invalid synthetic example <ArrowUpRight size={15} aria-hidden="true" /></button>
              <span className="small muted">Validation alone never changes active data.</span>
            </div>
            <div aria-live="polite">{validation && <ValidationPanel result={validation} onApply={applyDataset} />}</div>
          </div>
        </section>

        <section id="cohorts" className="workflow-section" aria-labelledby="cohorts-heading">
          <SectionHeading id="cohorts-heading" number="02" eyebrow="Cohorts & path" title="See what the denominator sees." description="A mature cohort is not a complete outcome. Keep confirmed value, unknowns and pending units in view." />
          <div className="contract-strip">
            <div><span className="eyebrow">Observation cutoff</span><strong>{active.settings.cutoff}</strong></div>
            <div><span className="eyebrow">Demonstration window</span><strong>{active.settings.windowDays} days · signup-based</strong></div>
            <div><span className="eyebrow">Completeness policy</span><strong>{active.settings.assumeComplete ? 'Trust declared complete coverage' : 'Do not assume complete coverage'}</strong></div>
          </div>
          <details className="settings-panel inline-details">
            <summary><span><SlidersHorizontal size={17} aria-hidden="true" />Measurement settings & filters</span><span className="summary-aside">Draft → explicit apply <ChevronDown size={16} aria-hidden="true" /></span></summary>
            <form onSubmit={(event) => { event.preventDefault(); applySettings(); }} noValidate>
              <p className="small muted">Unit: synthetic account. Cohort boundaries are half-open [start, end); the event window is [signup, signup + window). Enter RFC3339 timestamps with an explicit timezone. Active metrics do not update while you type.</p>
              <div className="settings-grid">
                {(['cohortStart', 'cohortEnd', 'cutoff'] as const).map((key) => (
                  <label className="field" key={key}><span>{key === 'cohortStart' ? 'Cohort start (inclusive)' : key === 'cohortEnd' ? 'Cohort end (exclusive)' : 'Observation cutoff'}</span><input type="text" value={draftSettings[key]} onChange={(event) => setSetting(key, event.target.value)} maxLength={40} spellCheck={false} placeholder="2026-10-11T00:00:00Z" /></label>
                ))}
                <label className="field"><span>Window in days</span><input type="number" min="1" max="365" step="1" value={draftSettings.windowDays} onChange={(event) => setSetting('windowDays', event.target.value)} /></label>
                <label className="field"><span>Signup-time segment</span><select value={draftSettings.segment} onChange={(event) => setSetting('segment', event.target.value as MetricSettings['segment'])}><option value="all">All segments</option>{SEGMENTS.map((segment) => <option key={segment} value={segment}>{words(segment)}</option>)}</select></label>
                <label className="field"><span>Signup-time channel</span><select value={draftSettings.channel} onChange={(event) => setSetting('channel', event.target.value as MetricSettings['channel'])}><option value="all">All channels</option>{CHANNELS.map((channel) => <option key={channel} value={channel}>{words(channel)}</option>)}</select></label>
              </div>
              <label className="checkbox-field"><input type="checkbox" checked={draftSettings.assumeComplete} onChange={(event) => setSetting('assumeComplete', event.target.checked)} /><span>Trust signup rows explicitly marked with complete outcome coverage.<small>Unknown coverage stays unknown; an incomplete verification result is not proof of failure.</small></span></label>
              <div aria-live="polite">{settingsErrors.length > 0 && <ul className="error-list">{settingsErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>}</div>
              <div className="button-row"><button type="submit" className="button button--amber">Apply settings <Check size={16} aria-hidden="true" /></button><button type="button" className="button button--quiet" onClick={() => { setDraftSettings(settingsDraft(active.settings)); setSettingsErrors([]); }}>Reset draft to active</button></div>
            </form>
          </details>
          <div className="active-filter-line"><span>Metric contract v1 · cohort: <strong>[{active.settings.cohortStart}, {active.settings.cohortEnd})</strong></span><span>Segment: <strong>{words(active.settings.segment)}</strong> · Channel: <strong>{words(active.settings.channel)}</strong></span></div>
          {!hasData && <div className="empty-callout"><Database size={23} aria-hidden="true" /><div><h3>Nothing to infer. Yet.</h3><p>Load the synthetic sample above to explore a cohort. Empty denominators are not zero-percent conversion.</p></div><a href="#data" className="text-link">Go to data <ArrowUpRight size={16} aria-hidden="true" /></a></div>}
          <div className="metric-grid">
            {[
              { code: 'D', label: 'Mature cohort', value: analysis.D, note: 'Eligible units with the full window elapsed.' },
              { code: 'N', label: 'Confirmed first value', value: analysis.N, note: 'Qualifying result and evidence in the window.' },
              { code: 'U', label: 'Unknown outcomes', value: analysis.U, note: 'Insufficient evidence or outcome coverage.' },
              { code: 'F', label: 'Known non-converters', value: analysis.F, note: 'D − N − U. Not inferred from missing data.' },
            ].map((metric) => (
              <div className={`metric-card metric-card--${metric.code.toLowerCase()}`} key={metric.code}><div className="metric-label"><span>{metric.label}</span><span className="metric-code">{metric.code}</span></div><p className="metric-value">{count(metric.value)}</p><p className="metric-note">{metric.note}</p></div>
            ))}
          </div>
          <div className="outcome-grid">
            <div className="panel outcome-panel">
              <div className="panel-heading"><p className="eyebrow">{analysis.U === 0 && analysis.D > 0 ? 'Definitive synthetic rate' : 'First-value outcome bounds'}</p><span className="small muted">N / D / U · {analysis.N} / {analysis.D} / {analysis.U}</span></div>
              <p className={`outcome-value${analysis.D === 0 ? ' outcome-value--empty' : ''}`}>{analysis.D === 0 ? 'Not estimable' : analysis.U === 0 ? percent(analysis.rate) : <>{percent(analysis.lower)}<span className="bounds-dash">—</span>{percent(analysis.upper)}</>}</p>
              <p className="small muted">{analysis.D === 0 ? 'No eligible mature units under the active settings.' : `Lower ${analysis.N}/${analysis.D} · Upper (${analysis.N}+${analysis.U})/${analysis.D}. ${analysis.U > 0 ? 'Unknown outcomes prevent a definitive overall rate.' : 'U = 0; all mature outcomes are known under this contract.'}`}</p>
              <div className="outcome-bar" role="img" aria-label={`${analysis.N} confirmed, ${analysis.F} known non-converters and ${analysis.U} unknown out of ${analysis.D} mature units`}>
                {analysis.D > 0 && <><span className="bar-confirmed" style={{ width: `${analysis.N / analysis.D * 100}%` }} /><span className="bar-failure" style={{ width: `${analysis.F / analysis.D * 100}%` }} /><span className="bar-unknown" style={{ width: `${analysis.U / analysis.D * 100}%` }} /></>}
              </div>
              <div className="bar-legend"><span><i className="bar-confirmed" />Confirmed {analysis.N}</span><span><i className="bar-failure" />Known non-converters {analysis.F}</span><span><i className="bar-unknown" />Unknown {analysis.U}</span></div>
            </div>
            <div className="supporting-metrics">
              <div><p className="eyebrow">Outcome coverage</p><strong>{percent(analysis.coverage)}</strong><p>(D − U) / D = {analysis.D - analysis.U} / {analysis.D}</p></div>
              <div><p className="eyebrow">Converter-only median</p><strong>{analysis.medianHours === null ? 'Not estimable' : `${analysis.medianHours.toFixed(1)} hours`}</strong><p>Time to first value among {analysis.N} confirmed converters only. Not a population median.</p></div>
            </div>
          </div>
          <div className="population-panel">
            <div className="panel-heading"><h3>Every unit has a place.</h3><span className="reconcile-label">{partitionSum === population.total ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}{partitionSum === population.total ? 'Population reconciles' : 'Reconciliation mismatch'}</span></div>
            <dl className="population-grid">
              {([
                ['Total signup units', population.total], ['Out of cohort / filters', population.outOfCohort],
                ['Excluded', population.excluded], ['Eligibility unknown', population.eligibilityUnknown],
                ['Mature (D)', population.mature], ['Pending', population.pending], ['Maturity unknown', population.maturityUnknown],
              ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{count(value)}</dd></div>)}
            </dl>
            <p className="small muted reconciliation-equation">Total {population.total} = out of cohort {population.outOfCohort} + excluded {population.excluded} + eligibility unknown {population.eligibilityUnknown} + mature {population.mature} + pending {population.pending} + maturity unknown {population.maturityUnknown}.</p>
            <p className="small muted">Pending units remain pending even when an early success is observed; they are not in D. Excluded, eligibility-unknown and out-of-cohort units never silently disappear.</p>
          </div>
          <div className="panel stage-panel">
            <div className="panel-heading"><div><p className="eyebrow">Observed journey</p><h3>Reached, not assumed.</h3></div><BarChart3 size={22} aria-hidden="true" /></div>
            <p className="small muted">Independent reached-counts against the same mature denominator D. These stages are not a guaranteed monotonic funnel, prerequisite sequence or causal conversion ratios.</p>
            <div className="stage-grid">
              {analysis.stages.map((stage, index) => (
                <div className="stage-card" key={stage.name}><span className="stage-number">0{index + 1}</span><h4>{stage.label}</h4><p><strong>{count(stage.count)}</strong><span> / {count(stage.denominator)} mature</span></p><div className="stage-bar" aria-hidden="true"><span style={{ width: `${stage.denominator ? stage.count / stage.denominator * 100 : 0}%` }} /></div><span className="small muted">{stage.denominator === 0 ? 'No denominator' : 'Observed within the fixed window'}</span></div>
              ))}
            </div>
          </div>
          <div className="panel breakdown-panel">
            <div className="panel-heading"><div><p className="eyebrow">Frozen at signup</p><h3>Different groups. Same rules.</h3></div><div className="segmented-control" role="group" aria-label="Breakdown dimension"><button type="button" aria-pressed={breakdown === 'segments'} onClick={() => setBreakdown('segments')}>Segment</button><button type="button" aria-pressed={breakdown === 'channels'} onClick={() => setBreakdown('channels')}>Channel</button></div></div>
            <p className="small muted">Unknown categories are retained. N = confirmed, D = mature, U = unknown. These are descriptive synthetic counts, not channel attribution or performance comparisons.</p>
            <BreakdownTable rows={selectedRows} dimension={breakdown === 'segments' ? 'Segment' : 'Channel'} />
            <p className="small muted table-reconciliation">Displayed groups sum to N {selectedRows.reduce((sum, row) => sum + row.N, 0)} / D {selectedRows.reduce((sum, row) => sum + row.D, 0)} / U {selectedRows.reduce((sum, row) => sum + row.U, 0)}; active cohort N {analysis.N} / D {analysis.D} / U {analysis.U}. Population exclusions are retained above.</p>
          </div>
          <div className="milestone-contract"><Info size={19} aria-hidden="true" /><div><h3>Hypothetical milestone v1 · first_value_verified</h3><p>Requires <code>result_complete=true</code> and evidence of <code>time_saved</code>, <code>rework_reduced</code> or <code>outcome_confirmed</code>, inside the signup-based window. These are synthetic evidence categories, not measured amounts or real customer claims. Setup and first use are not automatically first value.</p></div></div>
          {analysis.notices.length > 0 && <ul className="analysis-notices">{analysis.notices.map((message, index) => <li key={index}><Info size={14} aria-hidden="true" /><span>{message}</span></li>)}</ul>}
        </section>

        <section id="experiments" className="workflow-section" aria-labelledby="experiments-heading">
          <SectionHeading id="experiments-heading" number="03" eyebrow="Experiment lab" title="Make the next question a better one." description="A transparent priority rubric turns synthetic observations into hypotheses—not promises of uplift." />
          <div className="rubric-strip"><FlaskConical size={22} aria-hidden="true" /><div><strong>Impact × evidence-confidence / effort</strong><p>Ordinal inputs from 1–3. A subjective heuristic, not significance, causality, expected uplift or ROI. Lower effort breaks score ties; review remaining ties manually.</p></div><span className="status-label">Synthetic evidence only</span></div>
          {!hasData ? (
            <div className="empty-experiments"><FlaskConical size={33} aria-hidden="true" /><p className="eyebrow">No evidence, no recommendation</p><h3>Give the lab a synthetic cohort.</h3><p>Load the sample or apply validated data to see explainable experiment candidates.</p><button type="button" className="button button--outline" onClick={useSample}>Load synthetic sample <ArrowUpRight size={17} aria-hidden="true" /></button></div>
          ) : (
            <div className="experiment-grid">
              {experiments.map((experiment, index) => (
                <article className={`experiment-card${selectedId === experiment.id ? ' is-selected' : ''}`} key={experiment.id}>
                  <div className="experiment-topline"><span className="eyebrow">Candidate {String(index + 1).padStart(2, '0')}</span><span className="score-value">{experiment.score.toFixed(2)}<small>priority score</small></span></div>
                  <h3>{experiment.title}</h3><p className="experiment-hypothesis">{experiment.hypothesis}</p>
                  <p className="small"><strong>Audience:</strong> {experiment.audience}</p>
                  <div className="score-inputs"><span><strong>{experiment.impact}</strong>Impact</span><b aria-hidden="true">×</b><span><strong>{experiment.confidence}</strong>Confidence</span><b aria-hidden="true">/</b><span><strong>{experiment.effort}</strong>Effort</span></div>
                  <p className="experiment-evidence"><span className="eyebrow">Synthetic evidence</span>{experiment.evidence}</p>
                  <details className="inline-details rationale-details"><summary>Score rationale & proposed action <ChevronDown size={16} aria-hidden="true" /></summary><dl><dt>Impact · {experiment.impact}</dt><dd>{experiment.rationale.impact}</dd><dt>Confidence · {experiment.confidence}</dt><dd>{experiment.rationale.confidence}</dd><dt>Effort · {experiment.effort}</dt><dd>{experiment.rationale.effort}</dd><dt>Proposed action</dt><dd>{experiment.action}</dd><dt>Guardrails</dt><dd>{experiment.guardrails}</dd></dl></details>
                  <button type="button" className={`button ${selectedId === experiment.id ? 'button--amber' : 'button--outline'}`} aria-pressed={selectedId === experiment.id} onClick={() => selectExperiment(experiment)}>{selectedId === experiment.id ? <>Selected for plan <Check size={16} aria-hidden="true" /></> : <>Select experiment <ArrowRight size={16} aria-hidden="true" /></>}</button>
                </article>
              ))}
              {experiments.length === 0 && <p className="empty-callout">No experiment candidates for this analysis. Review the cohort settings and completeness first.</p>}
            </div>
          )}
          <p className="section-footnote">Choosing another candidate replaces the plan’s hypothesis and criteria. Changing active data or settings clears the selection for a fresh review.</p>
        </section>

        <section id="plan" className="workflow-section" aria-labelledby="plan-heading">
          <SectionHeading id="plan-heading" number="04" eyebrow="Campaign + plan" title="Leave with a plan. Not a claim." description="Construct a campaign URL and prepare a reproducible experiment brief. Neither action launches anything." />
          <div className="planning-grid">
            <div className="panel utm-panel">
              <div className="panel-heading"><div><p className="eyebrow">Optional / constructed locally</p><h3>A link, not a launch.</h3></div><Link2 size={22} aria-hidden="true" /></div>
              <p className="small muted">Use a public http/https destination and synthetic campaign labels only. No personal identifiers, credentials or private values. The URL is never opened by this workbench.</p>
              <form onSubmit={(event) => { event.preventDefault(); constructUTM(); }} autoComplete="off" noValidate>
                <label className="field"><span>Destination URL</span><input type="text" inputMode="url" value={utmInput.destination} onChange={(event) => editUTM('destination', event.target.value)} maxLength={2000} spellCheck={false} /></label>
                <div className="utm-fields">
                  {(['source', 'medium', 'campaign', 'content', 'term'] as const).map((key) => <label className={`field${key === 'campaign' ? ' field--wide' : ''}`} key={key}><span className="capitalize">{key}{key === 'content' || key === 'term' ? ' (optional)' : ''}</span><input type="text" value={utmInput[key]} onChange={(event) => editUTM(key, event.target.value)} maxLength={100} spellCheck={false} /></label>)}
                </div>
                <button type="submit" className="button button--outline">Construct URL <Link2 size={16} aria-hidden="true" /></button>
              </form>
              <div aria-live="polite">
                {utmResult && !utmResult.ok && <ul className="error-list">{utmResult.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
                {utmResult?.ok && <div className="utm-output"><label className="field" htmlFor="constructed-url"><span>Constructed URL · not clickable</span><textarea id="constructed-url" rows={4} readOnly value={utmResult.url} onFocus={(event) => event.target.select()} /></label><button type="button" className="text-button" onClick={() => { void copyUTM(); }}><Clipboard size={15} aria-hidden="true" />Copy URL</button><p className="small muted">This constructed URL will be included in the next plan export. Editing a field invalidates it until you construct it again.</p></div>}
              </div>
              <p className="small muted" role="status">{copyMessage}</p>
            </div>
            <div className="panel plan-panel">
              <div className="panel-heading"><div><p className="eyebrow">Synthetic experiment brief</p><h3>Make the handoff explicit.</h3></div><FileText size={22} aria-hidden="true" /></div>
              {selected ? <div className="selected-experiment"><CheckCircle2 size={17} aria-hidden="true" /><div><span className="eyebrow">Selected experiment</span><strong>{selected.title}</strong></div></div> : <div className="plan-empty-note"><Info size={18} aria-hidden="true" /><p>Select a candidate in the experiment lab to initialize these fields. <a href="#experiments">Go to experiment lab.</a></p></div>}
              <p className="small muted">Use synthetic role labels, not names or contact details. Use single-paragraph text without line breaks; exports are checked for private values and dataset identifiers.</p>
              <fieldset className="plan-fields" disabled={!selected}>
                <legend className="sr-only">Editable synthetic plan</legend>
                <label className="field"><span>Proposed owner (synthetic role)</span><input type="text" value={plan.owner} autoComplete="off" maxLength={80} placeholder="Synthetic growth owner" onChange={(event) => { setPlan((current) => ({ ...current, owner: event.target.value })); setPlanErrors([]); }} /></label>
                {([
                  ['hypothesis', 'Hypothesis'], ['guardrails', 'Guardrails'],
                  ['stopCriteria', 'Stop criteria'], ['successCriteria', 'Success criteria'],
                ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}<small>{plan[key].length} / 600</small></span><textarea rows={key === 'hypothesis' ? 3 : 2} value={plan[key]} autoComplete="off" maxLength={600} onChange={(event) => { setPlan((current) => ({ ...current, [key]: event.target.value })); setPlanErrors([]); }} /></label>)}
              </fieldset>
              <div aria-live="polite">{planErrors.length > 0 && <ul className="error-list">{planErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>}</div>
              <div className="export-actions"><button type="button" className="button button--amber" disabled={!selected || !hasData} onClick={() => downloadPlan('json')}><ArrowDownToLine size={17} aria-hidden="true" />Download JSON</button><button type="button" className="button button--outline" disabled={!selected || !hasData} onClick={() => downloadPlan('csv')}><ArrowDownToLine size={17} aria-hidden="true" />Download CSV</button></div>
              <p className="small muted">Deterministic filename: first-value-synthetic-plan. Exports include the metric contract and aggregate evidence, never account or event identifiers. Downloaded files remain on your device until you delete them.</p>
            </div>
          </div>
          <div className="delivery-note"><LockKeyhole size={18} aria-hidden="true" /><p><strong>Plans, not operational actions.</strong> No campaigns launched, payments processed, integrations connected or aircraft work instructed. Nothing here establishes significance, causal effects, expected uplift or real commercial performance.</p></div>
        </section>

        <footer className="site-footer">
          <div className="footer-title"><BarChart3 size={22} aria-hidden="true" /><span>First Value Engine</span><span className="status-label">Synthetic data</span></div>
          <p>Independent concept by Ayo Ahmed · Not affiliated with Rebolt.</p>
          <div className="footer-notes"><p>Visual adaptation uses local Arial / sans-serif, not Rebolt’s commercial Helvetica Now Display. No commercial font binaries or external fonts are loaded. Rebolt’s name and literal logo remain the property of their respective rights holders.</p><p>The default seven-day observation window and 11 October 2026 cutoff are fixed demonstration settings—not Rebolt’s four-to-six-week pilot. This independent GTM workbench does not represent Rebolt’s product, event schema or customer results.</p></div>
          <div className="footer-bottom"><span>Local session · no persistence · no operational write-backs</span><a href="#main" className="text-link">Back to overview <ArrowUpRight size={15} aria-hidden="true" /></a></div>
        </footer>
      </main>
    </div>
  );
}
