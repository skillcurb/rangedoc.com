/**
 * Icons chosen by name in the admin (ContentBlock.icon, ProductCategory.icon).
 * A fixed map keeps the bundle small (only these icons are shipped).
 */
import {
  Activity, Award, BadgeCheck, BarChart3, Bone, CalendarCheck, CheckCircle2, Clock, CreditCard, Dumbbell, Flame,
  Footprints, Hand, Heart, HeartPulse, Leaf, Lightbulb, Lock, Mail, MapPin, MessageCircle, Phone, Search, Settings,
  ShieldCheck, Snowflake, Sparkles, Star, Stethoscope, Truck, UserCheck, Users, Zap, PersonStanding, Bike, Accessibility,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Activity, Award, BadgeCheck, BarChart3, Bone, CalendarCheck, CheckCircle2, Clock, CreditCard, Dumbbell, Flame,
  Footprints, Hand, Heart, HeartPulse, Leaf, Lightbulb, Lock, Mail, MapPin, MessageCircle, Phone, Search, Settings,
  ShieldCheck, Snowflake, Sparkles, Star, Stethoscope, Truck, UserCheck, Users, Zap, PersonStanding, Bike, Accessibility,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, className }: { name?: string | null; className?: string }) {
  const C = (name && ICONS[name]) || CheckCircle2;
  return <C className={className} aria-hidden />;
}
