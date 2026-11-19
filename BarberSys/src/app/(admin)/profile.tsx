import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { JamOperasionalCard } from '@/components/JamOperasionalCard';

export default function AdminProfileScreen() {
  return (
    <ProfileForm
      title="Profil Manajer / Admin"
      fallbackName="Admin / Pemilik"
      footer={<JamOperasionalCard />}
    />
  );
}
