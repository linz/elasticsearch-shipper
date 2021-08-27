export type LogStat = { total: number; skipped: number; dropped: number; shipped: number };

export class LogStats {
  accounts: Map<string, LogStat> = new Map();

  account(accountId: string): LogStat {
    let existing = this.accounts.get(accountId);
    if (existing != null) return existing;
    existing = { total: 0, skipped: 0, dropped: 0, shipped: 0 };
    this.accounts.set(accountId, existing);
    return existing;
  }
}
