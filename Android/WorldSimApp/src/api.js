import { API_BASE } from './config';

class ApiService {
  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
  }

  async ollamaStatus() {
    const res = await fetch(`${API_BASE}/api/ollama/status`);
    if (!res.ok) throw new Error(`Ollama status failed (${res.status})`);
    return res.json();
  }

  async simulate(seed = 42, tickStart = 1, tickEnd = 120) {
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, tick_start: tickStart, tick_end: tickEnd }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Simulation failed (${res.status})`);
    }
    return res.json();
  }

  async analyze(model, summary, stateTable) {
    const res = await fetch(`${API_BASE}/api/ollama/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, summary, state_table: stateTable }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Analysis failed (${res.status})`);
    }
    return res.json();
  }
}

export default new ApiService();
