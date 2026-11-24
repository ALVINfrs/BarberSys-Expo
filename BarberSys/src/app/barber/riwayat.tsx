import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ReceiptHistoryScreen } from '@/components/receipt-history-screen';

export default function BarberRiwayatScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <ReceiptHistoryScreen title="Barber — Riwayat" barberId={user.id} />;
}
