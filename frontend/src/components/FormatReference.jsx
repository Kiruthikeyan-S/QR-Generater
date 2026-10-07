import React, { useState } from 'react';
import { Search, Box, Cpu, ShieldCheck, Layers, ShoppingCart, Truck, Tag } from 'lucide-react';

const SIMPLE_FORMATS = [
  { name: 'QR Code', type: '2D Matrix', desc: 'Mobile payments, URLs, Wi-Fi login, and digital contact cards.', icon: Box, tag: '2D' },
  { name: 'Data Matrix', type: '2D Matrix', desc: 'Aerospace parts, circuit boards, and medical device tracking.', icon: Cpu, tag: '2D' },
  { name: 'Aztec Code', type: '2D Matrix', desc: 'Airline boarding passes, railway tickets, and transit passes.', icon: ShieldCheck, tag: '2D' },
  { name: 'PDF417', type: '2D Stacked', desc: 'Driver licenses, government IDs, and shipping labels.', icon: Layers, tag: '2D' },
  { name: 'Micro QR Code', type: '2D Matrix', desc: 'Compact electronic parts and precision machinery.', icon: Box, tag: '2D' },
  { name: 'MaxiCode', type: '2D Honeycomb', desc: 'High-speed conveyor and parcel sorting (UPS standard).', icon: Truck, tag: '2D' },
  { name: 'Code 128', type: '1D Barcode', desc: 'Global supply chain, container tracking, and warehouse shipping.', icon: Truck, tag: '1D' },
  { name: 'Code 39', type: '1D Barcode', desc: 'Automotive manufacturing and military defense asset tags.', icon: Tag, tag: '1D' },
  { name: 'Code 93', type: '1D Barcode', desc: 'Postal parcel delivery and secure industrial item tracking.', icon: Tag, tag: '1D' },
  { name: 'ITF-14', type: '1D Barcode', desc: 'Corrugated cardboard boxes and master warehouse pallets.', icon: Box, tag: '1D' },
  { name: 'EAN-13', type: '1D Barcode', desc: 'Global retail point-of-sale checkout (Europe, Asia, Africa).', icon: ShoppingCart, tag: '1D' },
  { name: 'UPC-A', type: '1D Barcode', desc: 'Standard grocery and retail checkout across North America.', icon: ShoppingCart, tag: '1D' },
  { name: 'EAN-8', type: '1D Barcode', desc: 'Small retail items (cosmetics, stationery, confectionery).', icon: ShoppingCart, tag: '1D' },
  { name: 'UPC-E', type: '1D Barcode', desc: 'Compact North American retail packaging and beverage cans.', icon: ShoppingCart, tag: '1D' },
  { name: 'Codabar', type: '1D Barcode', desc: 'Blood banks, medical test tubes, and library books.', icon: Tag, tag: '1D' },
  { name: 'GS1 DataBar', type: '1D Barcode', desc: 'Fresh produce, loose grocery items, and medications.', icon: ShoppingCart, tag: '1D' },
  { name: 'RMQR', type: '2D Matrix', desc: 'Narrow rectangular strips on test tubes and PCB edges.', icon: Box, tag: '2D' },
];

export default function FormatReference() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const list = SIMPLE_FORMATS.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.tag === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Supported Formats</h2>
          <p className="text-xs text-slate-500">17 standard 1D & 2D optical symbologies decoded by the engine.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search format..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {['ALL', '2D', '1D'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simple Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {list.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${item.tag === '2D' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-sky-50 text-sky-600 border-sky-100'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">{item.type}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.tag === '2D' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                  {item.tag}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
