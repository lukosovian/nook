import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Bluetooth,
  Coffee,
  Droplet,
  Eye,
  Gamepad2,
  Globe,
  Languages,
  Target,
  WifiOff,
  BatteryCharging,
  BatteryLow,
  BatteryWarning,
  Camera,
  Clapperboard,
  Download,
  Fan,
  Headphones,
  MessageCircle,
  Mic,
  PlugZap,
  Usb,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { SysEventKind } from "../../lib/bridge";
import { useNook } from "../../store/nook";
import { ACCENT, MiniNook, tintText } from "../ui/primitives";

const STYLE: Record<SysEventKind, { icon: LucideIcon; color: string }> = {
  charging: { icon: BatteryCharging, color: ACCENT.green },
  unplugged: { icon: PlugZap, color: ACCENT.orange },
  "battery-low": { icon: BatteryLow, color: ACCENT.red },
  "usb-in": { icon: Usb, color: ACCENT.blue },
  "usb-out": { icon: Usb, color: ACCENT.gray },
  audio: { icon: Headphones, color: ACCENT.purple },
  screenshot: { icon: Camera, color: ACCENT.teal },
  "device-low": { icon: BatteryWarning, color: ACCENT.red },
  "headset-charging": { icon: BatteryCharging, color: ACCENT.green },
  fan: { icon: Fan, color: ACCENT.blue },
  mic: { icon: Mic, color: ACCENT.orange },
  camera: { icon: Video, color: ACCENT.green },
  download: { icon: Download, color: ACCENT.blue },
  chat: { icon: MessageCircle, color: ACCENT.purple },
  online: { icon: Globe, color: ACCENT.green },
  offline: { icon: WifiOff, color: ACCENT.red },
  "bt-in": { icon: Bluetooth, color: ACCENT.blue },
  "bt-out": { icon: Bluetooth, color: ACCENT.gray },
  notify: { icon: Bell, color: ACCENT.blue },
  translate: { icon: Languages, color: ACCENT.purple },
  focus: { icon: Target, color: ACCENT.red },
  break: { icon: Coffee, color: ACCENT.teal },
  eye: { icon: Eye, color: ACCENT.teal },
  water: { icon: Droplet, color: ACCENT.blue },
  game: { icon: Gamepad2, color: ACCENT.green },
  play: { icon: Gamepad2, color: ACCENT.pink },
  update: { icon: Download, color: ACCENT.green },
  argus: { icon: Clapperboard, color: ACCENT.orange },
};

/** Sistem olayı kartı: solda Nook (rozetli), ortada metin, sağda renkli mini avatar. */
export function ToastView() {
  const toast = useNook((s) => s.toasts[0]);

  return (
    <motion.div
      className="absolute inset-y-0 left-[52px] right-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {toast && (
          <motion.div
            key={toast.id}
            className="flex h-full items-center gap-3"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight" style={{ color: tintText(STYLE[toast.kind].color) }}>
                {toast.title}
              </p>
              {toast.detail && <p className="mt-0.5 truncate text-[11px] leading-tight text-label-2">{toast.detail}</p>}
            </div>
            <motion.span initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 16 }}>
              {toast.icon ? (
                <img src={toast.icon} alt="" draggable={false} className="h-7 w-7 rounded-[8px] object-contain" />
              ) : (
                <MiniNook color={STYLE[toast.kind].color} size={28} icon={STYLE[toast.kind].icon} />
              )}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
