'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { UserIcon, UsersIcon, ArrowLeftOnRectangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Group {
  id: string;
  name: string;
  members: {
    user: User;
    role: string;
  }[];
}

interface SidebarProps {
  selectedChat: {
    type: 'private' | 'group';
    id: string;
    name: string;
  } | null;
  onSelectChat: (chat: {
    type: 'private' | 'group';
    id: string;
    name: string;
  } | null) => void;
}

function UserAvatar({ user }: { user: { name: string; image?: string | null } }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name}
        width={40}
        height={40}
        className="rounded-full"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
      {user.name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Sidebar({ selectedChat, onSelectChat }: SidebarProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: selectedUsers,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGroups((prevGroups) => [...prevGroups, data]);
        setIsCreateGroupOpen(false);
        setGroupName('');
        setSelectedUsers([]);
        toast.success('Group created successfully!');
        // Switch to groups tab and select the new group
        setActiveTab('groups');
        onSelectChat({
          type: 'group',
          id: data.id,
          name: data.name
        });
      } else {
        toast.error(data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group. Please try again.');
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
              activeTab === 'users'
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
              activeTab === 'groups'
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100'
            }`}
          >
            <UsersIcon className="h-5 w-5" />
            <span>Groups</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'users' ? (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => onSelectChat({
                  type: 'private',
                  id: user.id,
                  name: user.name
                })}
                className={`p-3 rounded-lg hover:bg-gray-100 cursor-pointer ${
                  selectedChat?.id === user.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserAvatar user={user} />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="w-full p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create New Group</span>
            </button>
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onSelectChat({
                  type: 'group',
                  id: group.id,
                  name: group.name
                })}
                className={`p-3 rounded-lg hover:bg-gray-100 cursor-pointer ${
                  selectedChat?.id === group.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-gray-500">
                  {group.members.length} members
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserAvatar user={session?.user || { name: '?' }} />
            <div>
              <div className="font-medium">{session?.user?.name}</div>
              <div className="text-sm text-gray-500">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Transition appear show={isCreateGroupOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsCreateGroupOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Create New Group
                  </Dialog.Title>
                  <div className="mt-4">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group Name"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Select Members
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {users.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(
                                  selectedUsers.filter((id) => id !== user.id)
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsCreateGroupOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateGroup}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Create Group
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 