import React from "react";
import { Input } from "../ui/Input";
import { Search } from "lucide-react";

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative max-w-md mx-auto">
      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your thoughts and emotions..."
        className="pl-10 border-pink-200 focus:border-pink-300"
      />
    </div>
  );
}