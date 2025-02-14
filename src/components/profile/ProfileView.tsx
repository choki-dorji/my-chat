'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-4 p-4">
            <button onClick={handleBack} className="p-2 hover:bg-blue-700 rounded-full">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-3xl mx-auto">
        {/* Profile Image Section */}
        <div className="bg-white p-4 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            {isEditing ? (
              <label className="cursor-pointer block">
                <Image
                  src={image || `/api/avatar/${user.name}`}
                  alt={user.name}
                  fill
                  className="rounded-full object-cover"
                />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity">
                  Change Photo
                </div>
              </label>
            ) : (
              <Image
                src={user.image || `/api/avatar/${user.name}`}
                alt={user.name}
                fill
                className="rounded-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Info Sections */}
        <div className="mt-2">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="bg-white p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="bg-white p-4">
                <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                <p className="text-gray-500 text-sm">Name</p>
              </div>

              <div className="mt-2 bg-white p-4">
                <p className="text-gray-600">{user.email}</p>
                <p className="text-gray-500 text-sm">Email</p>
              </div>

              <div className="mt-2 bg-white p-4">
                <p className="text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-500 text-sm">Joined Date</p>
              </div>

              {!isOwnProfile && (
                <div className="mt-2 bg-white p-4">
                  <button
                    onClick={handleStartChat}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <ChatBubbleLeftIcon className="h-5 w-5" />
                    <span>Message</span>
                  </button>
                </div>
              )}

              {isOwnProfile && (
                <div className="mt-2 bg-white p-4">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full px-4 py-3 text-blue-600 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 