
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from '../constants';

export interface RegionOption {
  id: string;
  name: string;
  continent: string;
}

interface RegionAutocompleteProps {
  options: RegionOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  isLoading?: boolean;
}

const RegionAutocomplete: React.FC<RegionAutocompleteProps> = ({ options, value, onChange, label, placeholder, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInternalSelection = useRef(false);

  // Debounce the filtering query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Sync internal input state with external value prop
  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected && !isInternalSelection.current) {
      const displayText = `${selected.name} (${selected.id})`;
      setInputValue(displayText);
      setDebouncedQuery(displayText);
    } else if (!value && !isInternalSelection.current) {
       setInputValue('');
       setDebouncedQuery('');
    }
    isInternalSelection.current = false;
  }, [value, options]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        const selected = options.find(o => o.id === value);
        if (selected) {
           const displayText = `${selected.name} (${selected.id})`;
           setInputValue(displayText);
           setDebouncedQuery(displayText);
        } else if (!value) {
            setInputValue('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  const filteredOptions = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return options;

    const fuzzyMatch = (text: string, search: string) => {
        let searchIdx = 0, textIdx = 0;
        while (searchIdx < search.length && textIdx < text.length) {
            if (search[searchIdx] === text[textIdx]) {
                searchIdx++;
            }
            textIdx++;
        }
        return searchIdx === search.length;
    };

    return options
      .map(opt => {
        const id = opt.id.toLowerCase();
        const name = opt.name.toLowerCase();
        const continent = opt.continent.toLowerCase();
        const fullName = `${name} (${id})`.toLowerCase();
        
        let score = 0;
        if (id === q || name === q || fullName === q) score = 100;
        else if (fullName.includes(q)) score = 90; // Fix for pre-filled values matching
        else if (id.startsWith(q) || name.startsWith(q)) score = 80;
        else if (continent.startsWith(q)) score = 70;
        else if (id.includes(q) || name.includes(q)) score = 60;
        else if (continent.includes(q)) score = 50;
        else if (fuzzyMatch(id, q)) score = 40;
        
        return { opt, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.opt);
  }, [options, debouncedQuery]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, RegionOption[]> = {};
    const continentOrder = ['Americas', 'Europe', 'Asia Pacific', 'Middle East', 'Africa'];
    
    continentOrder.forEach(c => groups[c] = []);
    
    filteredOptions.forEach(opt => {
      const cont = opt.continent || 'Other';
      if (!groups[cont]) groups[cont] = [];
      groups[cont].push(opt);
    });
    
    Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) delete groups[key];
    });

    return groups;
  }, [filteredOptions]);

  const handleSelect = (option: RegionOption) => {
    isInternalSelection.current = true;
    const displayText = `${option.name} (${option.id})`;
    setInputValue(displayText);
    setDebouncedQuery(displayText);
    onChange(option.id);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue('');
      setDebouncedQuery('');
      onChange('');
      setIsOpen(true);
      inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
            setIsOpen(true);
            e.preventDefault();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        scrollActiveIntoView(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        scrollActiveIntoView(activeIndex - 1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleSelect(filteredOptions[activeIndex]);
        }
    } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
    }
  };

  const scrollActiveIntoView = (index: number) => {
      const el = document.getElementById(`region-${index}`);
      if (el) {
          el.scrollIntoView({ block: 'nearest' });
      }
  };

  return (
    <div className="relative group" ref={wrapperRef}>
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-wider group-focus-within:text-indigo-500 transition-colors">
        {label}
        {isLoading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
           <Icons.Globe />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 truncate shadow-sm cursor-text"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
           {inputValue && (
             <button 
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                tabIndex={-1}
             >
                <Icons.Cancel />
             </button>
           )}
           <div className="pointer-events-none text-slate-400">
             <Icons.ChevronDown />
           </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto custom-scrollbar animate-enter transform origin-top ring-1 ring-black/5">
          {Object.keys(groupedOptions).length === 0 ? (
            <div className="px-4 py-8 text-center">
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">No regions found</p>
                <p className="text-[10px] text-slate-500">Check spelling or try a fuzzy search (e.g. 'usc1')</p>
            </div>
          ) : (
            Object.entries(groupedOptions).map(([continent, items]: [string, RegionOption[]]) => (
                <div key={continent}>
                    <div className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 px-4 py-2 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{continent}</span>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{items.length}</span>
                    </div>
                    {items.map((option) => {
                        const globalIndex = filteredOptions.indexOf(option);
                        const isActive = globalIndex === activeIndex;

                        return (
                            <div
                                id={`region-${globalIndex}`}
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0 group/item ${
                                    isActive || option.id === value 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                                    : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold transition-colors ${
                                            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400'
                                        }`}>{option.name}</span>
                                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{option.continent}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{option.id}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RegionAutocomplete;
