import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { BarberSettingsCard } from '@/components/barber-settings-card';

export default function BarberProfileScreen() {
  return (
    <ProfileForm
      title="Profil Barber"
      fallbackName="Barber"
      footer={<BarberSettingsCard />}
    />
  );
}
