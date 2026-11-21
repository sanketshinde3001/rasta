import {
  AlertTriangle, ArrowLeft, Bus, Camera, Car, Check, ChevronRight, CircleAlert, Clock, CloudRain, Droplets,
  FileText, Footprints, Gavel, HardHat, Hospital, Image as ImageIcon, IndianRupee, Inbox, LogOut, Map, MapPin,
  Mic, Plus, Repeat, School, Scale, ShieldCheck, Sparkles, ThumbsUp, Users, Waves, X, Route, BookOpen, Wallet,
  Phone, Building2, ListFilter, Square, Navigation, Copy, Info, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  alert: AlertTriangle, back: ArrowLeft, bus: Bus, camera: Camera, car: Car, check: Check, chevron: ChevronRight,
  "circle-alert": CircleAlert, clock: Clock, cloud: CloudRain, droplets: Droplets, file: FileText, footprints: Footprints,
  gavel: Gavel, hardhat: HardHat, hospital: Hospital, image: ImageIcon, rupee: IndianRupee, inbox: Inbox, logout: LogOut,
  map: Map, pin: MapPin, mic: Mic, plus: Plus, repeat: Repeat, school: School, scale: Scale, shield: ShieldCheck,
  sparkles: Sparkles, thumbs: ThumbsUp, users: Users, waves: Waves, x: X, road: Route, book: BookOpen, wallet: Wallet,
  phone: Phone, building: Building2, filter: ListFilter, stop: Square, nav: Navigation, copy: Copy, info: Info,
};

export function Ico({ name, size = 20, stroke = 1.9, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  const C = ICONS[name] || CircleAlert;
  return <C size={size} strokeWidth={stroke} className={className} aria-hidden />;
}
