'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ChatBubbleLeftIcon, PhoneIcon } from '@heroicons/react/24/solid';

interface ProfileViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    createdAt: Date;
  };
  isOwnProfile: boolean;
}

export default function ProfileView({ user, isOwnProfile }: ProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          image,
        }),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleStartChat = () => {
    router.push(`/?chat=${user.id}&type=private&name=${encodeURIComponent(user.name)}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with large image */}
      <div className="bg-[#008069] text-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center p-4">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl">Profile</h1>
          </div>
        </div>
      </div>

      {/* Large Profile Image */}
      <div className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex justify-center">
            <div className="relative w-[200px] h-[200px] mb-4">
              <Image
                src={image || `/api/avatar/${user.name}`}
                alt={user.name}
                fill
                className="rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Sections */}
      <div className="max-w-3xl mx-auto mt-2 space-y-2">
        {/* Name Section */}
        <div className="bg-white p-4">
          <div className="text-[#008069] text-sm mb-1">Name</div>
          <div className="text-black text-lg">{user.name}</div>
        </div>

        {/* Email Section */}
        <div className="bg-white p-4">
          <div className="text-[#008069] text-sm mb-1">Email</div>
          <div className="text-black text-lg">{user.email}</div>
        </div>

        {/* About Section */}
        <div className="bg-white p-4">
          <div className="text-[#008069] text-sm mb-1">About</div>
          <div className="text-black text-lg">
            Joined {new Date(user.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {!isOwnProfile && (
          <div className="bg-white p-4 space-y-4">
            {/* Message Button */}
            <button
              onClick={handleStartChat}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#008069] text-white rounded-lg hover:bg-[#006d59]"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>Message</span>
            </button>

            {/* Voice Call Button */}
            <button
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#008069] text-white rounded-lg hover:bg-[#006d59]"
            >
              <PhoneIcon className="h-5 w-5" />
              <span>Voice Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 