'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Upload, CheckCircle, XCircle, FileText, Download, MessageSquare, Loader2,
  Calendar, MapPin, Phone, Clock, User as UserIcon, AlertCircle, Package
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'; // For unique file names

// Ensure you install uuid: npm install uuid @types/uuid

// Define interfaces for direct Supabase query results
interface UserBookingRow {
  id: string;
  user_id: string;
  service_title: string;
  original_price: number;
  discounted_price: number;
  booking_date: string;
  booking_time: string;
  status: string; // This is the raw status from DB, can be mixed case
  created_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  address: string;
  rating?: number;
  report_url?: string;
  phlebo_uid?: string;
  phlebo_assigned_at?: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
  phlebo_detail: {
    name: string;
    email: string;
  } | null;
}

interface Booking {
  id: string
  user_id: string
  service_title: string
  original_price: number
  discounted_price: number
  booking_date: string
  booking_time: string
  status: string // This will be consistent lowercase in our state
  created_at: string
  cancelled_at?: string
  cancel_reason?: string
  address: string
  rating?: number
  report_url?: string // Add report_url to the main Booking interface
  user?: {
    full_name: string
    email: string
    phone: string
  }
  phlebo?: {
    name: string
    email: string
  }
  phlebo_uid?: string
  phlebo_assigned_at?: string
}

const WHATSAPP_API_TOKEN = "9958399157"; // Your WhatsApp API Token
const WHATSAPP_API_URL = "https://wa.medblisss.com/send-image-url"; // The provided endpoint (verify if it supports PDFs)

const REPORT_BUCKET_NAME = 'user_reports'; // Define your Supabase Storage bucket name here

export default function AddReportPage() {
  const [activeTab, setActiveTab] = useState<'collected' | 'reported'>('collected');
  const [collectedBookings, setCollectedBookings] = useState<Booking[]>([]);
  const [reportedBookings, setReportedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null); // Tracks booking being uploaded
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentBookingForUpload, setCurrentBookingForUpload] = useState<Booking | null>(null);

  // This useEffect covers initial load and tab changes.
  useEffect(() => {
    // A function to handle the fetching based on the current tab
    const fetchDataForActiveTab = async () => {
      // Always fetch all relevant bookings (e.g., not cancelled) and filter in memory
      // This makes status filtering case-insensitive on the client side.
      await fetchAndFilterAllBookings();
    };
    fetchDataForActiveTab();
  }, [activeTab]); // Depend on activeTab

  // New function to fetch all relevant bookings and then filter them
  const fetchAndFilterAllBookings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: bookingsData, error } = (await supabase
        .from('user_bookings')
        .select(`
          *,
          profiles(full_name, email, phone),
          phlebo_detail(name, email),
          report_url  
        `)
        // Removed .eq('status', ...) from Supabase query to filter in JS
        .order('created_at', { ascending: false })) as { data: UserBookingRow[] | null, error: any };

      if (error) throw error;

      const allFormattedBookings: Booking[] = (bookingsData || []).map(booking => ({
        ...booking,
        user: booking.profiles || undefined,
        phlebo: booking.phlebo_detail || undefined,
        original_price: booking.original_price ?? 0,
        discounted_price: booking.discounted_price ?? 0,
        status: booking.status.toLowerCase(), // Normalize status to lowercase here
      }));

      // Now filter these normalized bookings for the two lists
      const collected = allFormattedBookings.filter(booking => booking.status === 'collected');
      const reported = allFormattedBookings.filter(booking => booking.status === 'reported');

      setCollectedBookings(collected);
      setReportedBookings(reported);

    } catch (error: any) {
      console.error('Error fetching and filtering bookings:', error.message);
      setErrorMessage(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Replaced fetchCollectedBookings and fetchReportedBookings with fetchAndFilterAllBookings
  // This ensures both tabs are always updated consistently after any action.


  const handleUploadClick = (booking: Booking) => {
    setCurrentBookingForUpload(booking);
    fileInputRef.current?.click(); // Programmatically click the hidden file input
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentBookingForUpload) {
      setErrorMessage("No file selected or no booking context.");
      return;
    }

    setUploadingId(currentBookingForUpload.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const fileExtension = file.name.split('.').pop();
    // Use a more robust filename, maybe including booking ID and timestamp for uniqueness
    const fileName = `${currentBookingForUpload.id}_${Date.now()}.${fileExtension}`;
    const filePath = `${currentBookingForUpload.user_id}/${fileName}`; // Path within the bucket

    try {
      // 1. Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: false, // Don't overwrite if file exists at this path
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(REPORT_BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for the uploaded report.');
      }
      const downloadUrl = publicUrlData.publicUrl;

      // 2. Update booking status and save report_url in Supabase database
      const { error: updateError } = await supabase
        .from('user_bookings')
        .update({
          status: 'reported', // Always update to lowercase 'reported'
          report_url: downloadUrl,
        })
        .eq('id', currentBookingForUpload.id);

      if (updateError) throw updateError;

      // 3. Send WhatsApp message
      await sendWhatsAppMessage(
        currentBookingForUpload.user?.phone || '',
        downloadUrl,
        currentBookingForUpload.user?.full_name || 'Valued Customer'
      );

      setSuccessMessage('Report uploaded and status updated successfully! WhatsApp message sent.');
      // Refresh both lists to ensure consistency
      fetchAndFilterAllBookings(); // Call unified refresh function

    } catch (error: any) {
      console.error('Upload or update failed:', error);
      setErrorMessage(`Failed to upload report or send message: ${error.message}`);
    } finally {
      setUploadingId(null);
      setCurrentBookingForUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input
      }
    }
  };

  const sendWhatsAppMessage = async (phoneNumber: string, reportUrl: string, userName: string) => {
    if (!phoneNumber) {
      console.warn("Phone number not available, skipping WhatsApp message.");
      return;
    }

    // Format phone number: remove leading +91 or any non-digit chars, then prepend 91
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '').replace(/^91/, '');
    const formattedNumber = `91${cleanedNumber}`; // Ensure it starts with 91

    const message = `Hello ${userName},\n\nGood news! Your MedBliss report for ${currentBookingForUpload?.service_title || 'your recent booking'} has been generated and is ready for download. You can access it here:\n\n${reportUrl}\n\nThank you for choosing MedBliss for your healthcare needs.\n\nBest regards,\nMedBliss Team`;

    const payload = {
      token: WHATSAPP_API_TOKEN,
      number: formattedNumber,
      imageUrl: reportUrl, // As per your provided API, assuming it can handle PDF URLs or will use a thumbnail
      caption: message,
    };

    try {
      const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("WhatsApp API error response:", data);
        throw new Error(`WhatsApp API failed: ${data.message || response.statusText}`);
      }
      console.log("WhatsApp message sent successfully:", data);
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error);
      // Don't set global error message, as the report might still be uploaded
      // You might want a separate notification for WhatsApp failure.
    }
  };

  const getStatusColor = (status: string) => {
    // Status in state is already normalized to lowercase
    switch (status) { 
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'collected': return 'bg-purple-100 text-purple-800';
      case 'done':
      case 'completed': return 'bg-green-100 text-green-800';
      case 'notcollected': return 'bg-amber-100 text-amber-800';
      case 'cancel':
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'otp': return 'bg-yellow-100 text-yellow-800';
      case 'reported': return 'bg-emerald-100 text-emerald-800'; // New color for reported
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg text-gray-700">Loading bookings...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Reports</h1>

        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === 'collected' ? 'default' : 'outline'}
            onClick={() => setActiveTab('collected')}
          >
            Collected Samples ({collectedBookings.length})
          </Button>
          <Button
            variant={activeTab === 'reported' ? 'default' : 'outline'}
            onClick={() => setActiveTab('reported')}
          >
            Reported Users ({reportedBookings.length})
          </Button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline ml-2">{successMessage}</span>
          </div>
        )}

        <FilterBar // You might want to implement search/filter for these tables too
          onDateFilter={() => { /* Implement if needed */ }}
          onSearch={() => { /* Implement if needed */ }}
          showStatus={false} // Status filter is handled by tabs
        />

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf" // Only allow PDF files
          style={{ display: 'none' }}
        />

        {activeTab === 'collected' && (
          <Card>
            <CardHeader>
              <CardTitle>Collected Samples Ready for Report Upload</CardTitle>
            </CardHeader>
            <CardContent>
              {collectedBookings.length === 0 ? (
                <p className="text-center text-gray-500">No collected samples found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collectedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar><AvatarFallback>{booking.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback></Avatar>
                            <div>
                              <div className="font-medium">{booking.user?.full_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{booking.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{booking.service_title}</TableCell>
                        <TableCell>
                          {format(new Date(booking.booking_date), 'MMM dd, yyyy')} at {booking.booking_time}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUploadClick(booking)}
                            disabled={uploadingId === booking.id}
                          >
                            {uploadingId === booking.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            {uploadingId === booking.id ? 'Uploading...' : 'Upload Report'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'reported' && (
          <Card>
            <CardHeader>
              <CardTitle>Reported Users</CardTitle>
            </CardHeader>
            <CardContent>
              {reportedBookings.length === 0 ? (
                <p className="text-center text-gray-500">No reported users found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Reported Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar><AvatarFallback>{booking.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback></Avatar>
                            <div>
                              <div className="font-medium">{booking.user?.full_name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{booking.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{booking.service_title}</TableCell>
                        <TableCell>
                          {/* Use created_at or a specific report_upload_date if you add one */}
                          {booking.created_at ? format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.report_url ? (
                            <a href={booking.report_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> View Report
                              </Button>
                            </a>
                          ) : (
                            <span className="text-gray-500 text-sm">No URL</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}