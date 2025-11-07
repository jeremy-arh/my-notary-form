import { useState } from 'react';
import { Icon } from '@iconify/react';
import AdminLayout from '../../components/admin/AdminLayout';
import NotariesList from './NotariesList';
import Payouts from './Payouts';

const Notary = () => {
  const [activeTab, setActiveTab] = useState('notaries');

  const tabs = [
    { id: 'notaries', name: 'Notaries', icon: 'heroicons:user-group' },
    { id: 'payouts', name: 'Payouts', icon: 'heroicons:banknotes' }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notary</h1>
          <p className="text-gray-600 mt-2">Gérer les notaires et les payouts</p>
        </div>

        {/* Tabs */}
        <div className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-2">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon icon={tab.icon} className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'notaries' && <NotariesList />}
          {activeTab === 'payouts' && <Payouts />}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Notary;
