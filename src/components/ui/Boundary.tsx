import { Component, type ReactNode } from "react";
import { useNook } from "../../store/nook";

/**
 * Bir bölüm hata verirse tüm ada boşalmasın: hata günlüğe yazılır, ana sayfaya dönülür.
 * `resetKey` değişince (başka bölüme geçince) yeniden denenir.
 */
export class Boundary extends Component<{ children: ReactNode; resetKey: string }, { failed: string | null }> {
  state = { failed: null as string | null };

  static getDerivedStateFromError(e: Error) {
    return { failed: e.message };
  }

  componentDidCatch(e: Error, info: { componentStack?: string | null }) {
    console.error(`[nook] bölüm çöktü: ${e.message}`, info.componentStack?.split("\n").slice(0, 4).join(" ") ?? "");
    window.setTimeout(() => useNook.getState().setTab("home"), 0);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: null });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
