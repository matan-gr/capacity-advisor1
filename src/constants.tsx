
import React from 'react';
import { 
  Cloud, 
  Info, 
  Check, 
  Zap, 
  Layers, 
  Server, 
  Terminal, 
  ChevronDown, 
  X, 
  RefreshCw, 
  Cpu,
  Moon,
  Sun,
  Copy,
  MapPin,
  Globe,
  AlertTriangle
} from 'lucide-react';

export const Icons = {
  Cloud: (props: any) => <Cloud size={20} {...props} />,
  Info: (props: any) => <Info size={16} {...props} />,
  Check: (props: any) => <Check size={16} {...props} />,
  Bolt: (props: any) => <Zap size={16} {...props} />,
  Layers: (props: any) => <Layers size={16} {...props} />,
  Server: (props: any) => <Server size={16} {...props} />,
  Terminal: (props: any) => <Terminal size={16} {...props} />,
  ChevronDown: (props: any) => <ChevronDown size={14} {...props} />,
  Cancel: (props: any) => <X size={16} {...props} />,
  Refresh: (props: any) => <RefreshCw size={16} {...props} />,
  Chip: (props: any) => <Cpu size={14} {...props} />,
  Moon: (props: any) => <Moon size={16} {...props} />,
  Sun: (props: any) => <Sun size={16} {...props} />,
  Copy: (props: any) => <Copy size={12} {...props} />,
  MapPin: (props: any) => <MapPin size={14} {...props} />,
  Globe: (props: any) => <Globe size={14} {...props} />,
  Alert: (props: any) => <AlertTriangle size={16} {...props} />
};
