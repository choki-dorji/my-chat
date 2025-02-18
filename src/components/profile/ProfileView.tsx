'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ChatBubbleLeftIcon, PhoneIcon, UsersIcon } from '@heroicons/react/24/solid';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface GroupMember {
  user: User;
  role: string;
}

interface ProfileViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    createdAt: Date;
    isGroup?: boolean;
    members?: GroupMember[];
  };
  isOwnProfile: boolean;
}

export default function ProfileView({ user, isOwnProfile }: ProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image);
  const [showMembers, setShowMembers] = useState(false);

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

  const handleBack = () => {
    router.back();
  };

  const handleStartChat = (userId?: string, userName?: string) => {
    if (userId && userName) {
      router.push(`/?chat=${userId}&type=private&name=${encodeURIComponent(userName)}`);
    } else {
      router.push(`/?chat=${user.id}&type=${user.isGroup ? 'group' : 'private'}&name=${encodeURIComponent(user.name)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - changed from [#008069] to [#0084FF] */}
      <div className="bg-[#0084FF] text-white">
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

      {/* Info Sections - changed text color from [#008069] to [#0084FF] */}
      <div className="max-w-3xl mx-auto mt-2 space-y-2">
        {/* Name Section */}
        <div className="bg-white p-4">
          <div className="text-[#0084FF] text-sm mb-1">Name</div>
          <div className="text-black text-lg">{user.name}</div>
        </div>

        {user.isGroup ? (
          // Group Members Section
          <div className="bg-white p-4">
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center justify-between w-full"
            >
              <div>
                <div className="text-[#0084FF] text-sm mb-1">Members</div>
                <div className="text-black text-lg">{user.members?.length || 0} members</div>
              </div>
              <UsersIcon className="h-5 w-5 text-[#0084FF]" />
            </button>

            {showMembers && (
              <div className="mt-4 space-y-3">
                {user.members?.map((member) => (
                  <div key={member.user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 relative">
                        <Image
                          src={member.user.image || `/api/avatar/${member.user.name}`}
                          alt={member.user.name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{member.user.name}</div>
                        <div className="text-sm text-gray-500">{member.role}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartChat(member.user.id, member.user.name)}
                      className="p-2 text-[#0084FF] hover:bg-blue-50 rounded-full"
                    >
                      <ChatBubbleLeftIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Email Section */}
          <div className="bg-white p-4">
            <div className="text-[#0084FF] text-sm mb-1">Email</div>
            <div className="text-black text-lg">{user.email}</div>
          </div>
        )}

        {/* About Section */}
        <div className="bg-white p-4">
          <div className="text-[#0084FF] text-sm mb-1">About</div>
          <div className="text-black text-lg">
            {user.isGroup ? 'Group created' : 'Joined'} {new Date(user.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {!isOwnProfile && (
          <div className="bg-white p-4 space-y-4">
            {/* Message Button - changed from [#008069] to [#0084FF] */}
            <button
              onClick={() => handleStartChat()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#0084FF] text-white rounded-lg hover:bg-[#0084FF]/90"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>Message</span>
            </button>

            {/* Voice Call Button - changed from [#008069] to [#0084FF] */}
            <button
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#0084FF] text-white rounded-lg hover:bg-[#0084FF]/90"
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