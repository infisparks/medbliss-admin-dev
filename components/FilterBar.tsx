'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Search } from 'lucide-react'

interface UserProfileSuggestion {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
}

interface FilterBarProps {
  onDateFilter: (filter: string) => void
  onSearch: (search: string) => void
  onStatusFilter?: (status: string) => void
  showStatus?: boolean
  suggestions?: UserProfileSuggestion[]
  onSuggestionSelect?: (profile: UserProfileSuggestion) => void
}

export default function FilterBar({ onDateFilter, onSearch, onStatusFilter, showStatus = false, suggestions = [], onSuggestionSelect }: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchTerm)
    setShowDropdown(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (e.target.value.length > 0 && suggestions.length > 0) {
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  const handleSuggestionClick = (profile: UserProfileSuggestion) => {
    setSearchTerm(profile.full_name || profile.email || profile.phone || '')
    setShowDropdown(false)
    if (onSuggestionSelect) {
      onSuggestionSelect(profile)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={handleInputChange}
            className="pl-10"
            autoComplete="off"
            onFocus={() => { if (searchTerm.length > 0 && suggestions.length > 0) setShowDropdown(true) }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 max-h-48 overflow-y-auto">
              {suggestions.map((profile) => (
                <div
                  key={profile.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => handleSuggestionClick(profile)}
                >
                  <div className="font-medium">{profile.full_name || profile.email || profile.phone}</div>
                  <div className="text-xs text-gray-500">{profile.email} {profile.phone}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex gap-2">
        <Select onValueChange={(val) => {
          // Map UI values to dashboard logic values
          if (val === 'today') onDateFilter('today')
          else if (val === 'week') onDateFilter('thisWeek')
          else if (val === 'month') onDateFilter('thisMonth')
          else onDateFilter('all')
        }}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {showStatus && onStatusFilter && (
          <Select onValueChange={onStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}