import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Input, ProgressCircle } from '@bigcommerce/big-design';

interface SearchAutocompleteProps<T> {
  placeholder: string;
  value: string;
  onChange: (query: string) => void;
  results: T[];
  isLoading: boolean;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  getKey: (item: T) => string | number;
}

export function SearchAutocomplete<T>({
  placeholder,
  value,
  onChange,
  results,
  isLoading,
  renderItem,
  onSelect,
  getKey,
}: SearchAutocompleteProps<T>) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Show dropdown when results exist
  useEffect(() => {
    setIsOpen(results.length > 0);
    setActiveIndex(-1);
  }, [results]);

  const handleChange = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(query), 300);
    },
    [onChange],
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSelect(results[activeIndex]);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[activeIndex]) {
        (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  return (
    <Box style={{ position: 'relative' }}>
      <Input
        placeholder={placeholder}
        defaultValue={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        iconRight={isLoading ? <ProgressCircle size="xSmall" /> : undefined}
      />

      {isOpen && (
        <Box
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 10,
            left: 0,
            right: 0,
            border: '1px solid #d9dce9',
            borderRadius: 4,
            maxHeight: 200,
            overflow: 'auto',
            background: '#fff',
          }}
          marginTop="xxSmall"
        >
          {results.map((item, index) => (
            <div
              key={getKey(item)}
              role="option"
              aria-selected={index === activeIndex}
              className="scribe-autocomplete-item"
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
              }}
            >
              {renderItem(item)}
            </div>
          ))}
        </Box>
      )}
    </Box>
  );
}
