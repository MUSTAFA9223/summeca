'use client';

import React, { Suspense } from 'react';
import UserSupportContent from './UserSupportContent';

export default function UserSupportPage() {
  return (
    <Suspense fallback={null}>
      <UserSupportContent />
    </Suspense>
  );
}
