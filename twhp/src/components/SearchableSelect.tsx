"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Option = {
  id: number | string;
  label: string;
};

interface SearchableSelectProps {
  options: Option[];
  value: number | string | "";
  onChange: (value: number | string | "") => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "เลือกรายการ",
  disabled = false,
  className = "",
  error,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id.toString() === value.toString()),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) setSearchTerm("");
    }
  };

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  const inputBase =
    "w-full px-4 py-2 border rounded-lg outline-none transition-all text-black flex items-center justify-between bg-white";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`${inputBase} ${
          disabled ? "bg-gray-50 cursor-not-allowed opacity-60 border-gray-200" : "hover:border-gray-300 border-gray-200"
        } ${error ? "border-red-600" : ""} ${
          isOpen ? "ring-2 ring-brand border-transparent" : ""
        }`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <div className="flex-1 truncate text-left text-sm">
          {selectedOption ? (
            <span className="text-black">{selectedOption.label}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {selectedOption && !disabled && (
            <X
              size={14}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-50 flex items-center gap-2 sticky top-0 bg-white">
            <Search size={14} className="text-gray-400 ml-2" />
            <input
              type="text"
              className="w-full text-sm outline-none py-1.5 pr-2 bg-transparent"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                   e.preventDefault();
                   if (filteredOptions.length > 0) {
                      handleSelect(filteredOptions[0]);
                   }
                }
              }}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                    ${value.toString() === option.id.toString() ? "bg-green-50 text-brand font-semibold" : "text-gray-700"}
                  `}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-sm text-gray-500 text-center">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
