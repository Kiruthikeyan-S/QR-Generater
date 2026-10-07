import React, { useState, useEffect } from 'react';
import {
  Globe, QrCode, Phone, Mail, MessageSquare, Wifi, User, MapPin,
  Tag, ShoppingBag, Truck, Code2, Download, Copy, Check, ShieldCheck,
  RefreshCw, AlertCircle, Sparkles, ExternalLink
} from 'lucide-react';

const PAYLOAD_TYPES = [
  { id: 'url', name: 'Website URL', icon: Globe, hint: 'opens a link in mobile browser', defaultField: { url: 'https://example.com' } },
  { id: 'text', name: 'Plain Text', icon: QrCode, hint: 'encodes raw UTF-8 textual message', defaultField: { text: 'Hello, welcome to QR & Barcode Tools!' } },
  { id: 'phone', name: 'Phone Number', icon: Phone, hint: 'triggers instant mobile dialer', defaultField: { phone: '+1 (555) 019-2834' } },
  { id: 'email', name: 'Email Address', icon: Mail, hint: 'pre-fills recipient & subject', defaultField: { to: 'support@example.com', subject: 'Order Inquiry', body: 'Please provide shipping updates for my order.', style: 'mailto' } },
  { id: 'sms', name: 'SMS Message', icon: MessageSquare, hint: 'pre-fills SMS recipient & message', defaultField: { number: '+1 (555) 839-2019', sms_body: 'Arrived at loading dock.' } },
  { id: 'wifi', name: 'Wi-Fi Network', icon: Wifi, hint: 'auto-connects mobile devices to Wi-Fi', defaultField: { ssid: 'Office-Guest-WiFi', password: 'SecurePassword123', auth: 'WPA', hidden: false } },
  { id: 'vcard', name: 'Contact / vCard', icon: User, hint: 'imports contact to address book', defaultField: { first_name: 'Sarah', last_name: 'Connor', organization: 'Apex Logistics Corp', title: 'Operations Director', vcard_phone: '+1 555 987 6543', vcard_email: 'sarah.connor@apexlogistics.com', vcard_url: 'https://apexlogistics.com', street: '100 Industrial Parkway', city: 'San Francisco', state: 'CA', zip: '94107', country: 'USA', note: 'Enterprise logistics partner' } },
  { id: 'geo', name: 'Location (Geo)', icon: MapPin, hint: 'opens coordinates in map apps', defaultField: { lat: '37.7749', lng: '-122.4194', query: 'San Francisco Fulfillment Center' } },
  { id: 'sku', name: 'Product / SKU', icon: Tag, hint: 'encodes SKU, GTIN & pricing info', defaultField: { sku: 'SKU-LOG-99482', name: 'Industrial Scanner', gtin: '0123456789012', price: '$249.00' } },
  { id: 'order', name: 'Order ID', icon: ShoppingBag, hint: 'encodes purchase order reference', defaultField: { order_id: 'ORD-2026-9921', customer: 'Acme Corp', amount: '$1,450.00', items_count: '12 Units' } },
  { id: 'shipping', name: 'Shipping / AWB', icon: Truck, hint: 'encodes logistics tracking & route', defaultField: { awb: 'AWB-8839210492', carrier: 'FedEx Express', origin: 'SFO', destination: 'JFK', status: 'In Transit' } },
  { id: 'json', name: 'Structured JSON', icon: Code2, hint: 'encodes structured JSON object', defaultField: { json_content: '{\n  "status": "active",\n  "consignment_id": "CS-9981",\n  "verified": true\n}' } },
];

export default function QRGenerator() {
  const [activeType, setActiveType] = useState('url');
  const [size, setSize] = useState(400);
  const [ecc, setEcc] = useState('M');
  const [outputFormat, setOutputFormat] = useState('PNG');

  // Input states initialized with valid defaults
  const [fields, setFields] = useState({
    url: 'https://example.com',
    text: 'Hello, welcome to QR & Barcode Tools!',
    phone: '+1 (555) 019-2834',
    to: 'support@example.com',
    subject: 'Order Inquiry',
    body: 'Please provide shipping updates for my order.',
    style: 'mailto',
    number: '+1 (555) 839-2019',
    sms_body: 'Arrived at loading dock.',
    ssid: 'Office-Guest-WiFi',
    password: 'SecurePassword123',
    auth: 'WPA',
    hidden: false,
    first_name: 'Sarah',
    last_name: 'Connor',
    organization: 'Apex Logistics Corp',
    title: 'Operations Director',
    vcard_phone: '+1 555 987 6543',
    vcard_email: 'sarah.connor@apexlogistics.com',
    vcard_url: 'https://apexlogistics.com',
    street: '100 Industrial Parkway',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    country: 'USA',
    note: 'Enterprise logistics partner',
    lat: '37.7749',
    lng: '-122.4194',
    query: 'San Francisco Fulfillment Center',
    sku: 'SKU-LOG-99482',
    name: 'Industrial Scanner',
    gtin: '0123456789012',
    price: '$249.00',
    order_id: 'ORD-2026-9921',
    customer: 'Acme Corp',
    amount: '$1,450.00',
    items_count: '12 Units',
    awb: 'AWB-8839210492',
    carrier: 'FedEx Express',
    origin: 'SFO',
    destination: 'JFK',
    status: 'In Transit',
    json_content: '{\n  "status": "active",\n  "consignment_id": "CS-9981",\n  "verified": true\n}'
  });

  const [qrResult, setQrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const executeGenerate = async (typeToGenerate = activeType, currentFields = fields) => {
    setLoading(true);
    setError(null);

    let payloadFields = {};
    if (typeToGenerate === 'url') {
      const rawUrl = (currentFields.url || '').trim();
      if (!rawUrl || rawUrl === 'https://' || rawUrl === 'http://') {
        setError('Please enter a valid website URL (e.g. https://example.com).');
        setLoading(false);
        return;
      }
      payloadFields = { url: rawUrl };
    } else if (typeToGenerate === 'text') {
      payloadFields = { text: currentFields.text || 'Sample Text' };
    } else if (typeToGenerate === 'phone') {
      payloadFields = { phone: currentFields.phone || '+15551234567' };
    } else if (typeToGenerate === 'email') {
      payloadFields = { to: currentFields.to, subject: currentFields.subject, body: currentFields.body, style: currentFields.style };
    } else if (typeToGenerate === 'sms') {
      payloadFields = { number: currentFields.number, body: currentFields.sms_body };
    } else if (typeToGenerate === 'wifi') {
      payloadFields = { ssid: currentFields.ssid, password: currentFields.password, auth: currentFields.auth, hidden: currentFields.hidden };
    } else if (typeToGenerate === 'vcard') {
      payloadFields = {
        first_name: currentFields.first_name,
        last_name: currentFields.last_name,
        organization: currentFields.organization,
        title: currentFields.title,
        phone: currentFields.vcard_phone,
        email: currentFields.vcard_email,
        url: currentFields.vcard_url,
        street: currentFields.street,
        city: currentFields.city,
        state: currentFields.state,
        zip: currentFields.zip,
        country: currentFields.country,
        note: currentFields.note
      };
    } else if (typeToGenerate === 'geo') {
      payloadFields = { lat: currentFields.lat, lng: currentFields.lng, query: currentFields.query };
    } else if (typeToGenerate === 'sku') {
      payloadFields = { sku: currentFields.sku, name: currentFields.name, gtin: currentFields.gtin, price: currentFields.price };
    } else if (typeToGenerate === 'order') {
      payloadFields = { order_id: currentFields.order_id, customer: currentFields.customer, amount: currentFields.amount, items_count: currentFields.items_count };
    } else if (typeToGenerate === 'shipping') {
      payloadFields = { awb: currentFields.awb, carrier: currentFields.carrier, origin: currentFields.origin, destination: currentFields.destination, status: currentFields.status };
    } else if (typeToGenerate === 'json') {
      payloadFields = { json_content: currentFields.json_content };
    }

    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload_type: typeToGenerate,
          fields: payloadFields,
          ecc: ecc,
          size: size,
          format: outputFormat === 'BOTH' ? 'BOTH' : (outputFormat === 'SVG' ? 'SVG' : 'PNG'),
          fill_color: '#000000',
          back_color: '#ffffff'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate QR code');
      }

      setQrResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate on initial mount with valid default URL
  useEffect(() => {
    executeGenerate('url', fields);
  }, []);

  // Handle switching payload type
  const handleTypeSelect = (newType) => {
    setActiveType(newType);
    setError(null);
    executeGenerate(newType, fields);
  };

  const copyPayload = () => {
    if (!qrResult?.payload) return;
    navigator.clipboard.writeText(qrResult.payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const downloadFile = (content, filename, type) => {
    const blob = type === 'image/svg+xml'
      ? new Blob([content], { type })
      : (() => {
          const byteString = atob(content.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          return new Blob([ab], { type });
        })();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentTypeMeta = PAYLOAD_TYPES.find((t) => t.id === activeType);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Card: Configuration Form */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-6">
        
        {/* Card Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <QrCode className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">QR Code Generator</h2>
            <p className="text-xs text-slate-500">
              Create verified QR codes for websites, Wi-Fi, contacts, logistics, and structured data.
            </p>
          </div>
        </div>

        {/* Section 1: Payload Type Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            1. SELECT QR PAYLOAD TYPE
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PAYLOAD_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = activeType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeSelect(t.id)}
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 shadow-xs ring-1 ring-sky-500 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-sky-600 stroke-[2.4]' : 'text-slate-500'}`} />
                  <span className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Form Inputs */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. FILL CONTENT ({currentTypeMeta?.name.toUpperCase()})
            </h3>
            <span className="text-[11px] text-slate-400 italic">
              {currentTypeMeta?.hint}
            </span>
          </div>

          <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
            
            {/* Website URL */}
            {activeType === 'url' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                <input
                  type="text"
                  value={fields.url}
                  onChange={(e) => updateField('url', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium"
                  placeholder="https://example.com"
                />
              </div>
            )}

            {/* Plain Text */}
            {activeType === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  value={fields.text}
                  onChange={(e) => updateField('text', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter text payload..."
                />
              </div>
            )}

            {/* Phone Number */}
            {activeType === 'phone' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (with Country Code)</label>
                <input
                  type="tel"
                  value={fields.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-mono"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            )}

            {/* Email Address */}
            {activeType === 'email' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={fields.to}
                      onChange={(e) => updateField('to', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                      placeholder="support@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Encoding Style</label>
                    <select
                      value={fields.style}
                      onChange={(e) => updateField('style', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-500"
                    >
                      <option value="mailto">Standard mailto:</option>
                      <option value="matmsg">MATMSG: Format</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={fields.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
                  <textarea
                    rows={2}
                    value={fields.body}
                    onChange={(e) => updateField('body', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* SMS Message */}
            {activeType === 'sms' && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Number</label>
                  <input
                    type="tel"
                    value={fields.number}
                    onChange={(e) => updateField('number', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message Text</label>
                  <textarea
                    rows={2}
                    value={fields.sms_body}
                    onChange={(e) => updateField('sms_body', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Wi-Fi Network */}
            {activeType === 'wifi' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Network Name (SSID)</label>
                    <input
                      type="text"
                      value={fields.ssid}
                      onChange={(e) => updateField('ssid', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Authentication</label>
                    <select
                      value={fields.auth}
                      onChange={(e) => updateField('auth', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-500"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                </div>
                {fields.auth !== 'nopass' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="text"
                      value={fields.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Contact / vCard */}
            {activeType === 'vcard' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={fields.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={fields.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Organization"
                    value={fields.organization}
                    onChange={(e) => updateField('organization', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Job Title"
                    value={fields.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Mobile Phone"
                    value={fields.vcard_phone}
                    onChange={(e) => updateField('vcard_phone', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={fields.vcard_email}
                    onChange={(e) => updateField('vcard_email', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            {activeType === 'geo' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (e.g. 37.7749)"
                    value={fields.lat}
                    onChange={(e) => updateField('lat', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (e.g. -122.4194)"
                    value={fields.lng}
                    onChange={(e) => updateField('lng', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Location Name / Label"
                  value={fields.query}
                  onChange={(e) => updateField('query', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            )}

            {/* Product SKU */}
            {activeType === 'sku' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="SKU Code"
                    value={fields.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="GTIN / Barcode"
                    value={fields.gtin}
                    onChange={(e) => updateField('gtin', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Product Title"
                    value={fields.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="col-span-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={fields.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Order ID */}
            {activeType === 'order' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Order ID"
                  value={fields.order_id}
                  onChange={(e) => updateField('order_id', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={fields.customer}
                  onChange={(e) => updateField('customer', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Total Amount"
                  value={fields.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Item Count"
                  value={fields.items_count}
                  onChange={(e) => updateField('items_count', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            )}

            {/* Shipping / AWB */}
            {activeType === 'shipping' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="AWB / Tracking #"
                    value={fields.awb}
                    onChange={(e) => updateField('awb', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Carrier"
                    value={fields.carrier}
                    onChange={(e) => updateField('carrier', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Origin"
                    value={fields.origin}
                    onChange={(e) => updateField('origin', e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Destination"
                    value={fields.destination}
                    onChange={(e) => updateField('destination', e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Status"
                    value={fields.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            {/* JSON */}
            {activeType === 'json' && (
              <div>
                <textarea
                  rows={4}
                  value={fields.json_content}
                  onChange={(e) => updateField('json_content', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800"
                />
              </div>
            )}

          </div>
        </div>

        {/* Section 3: Dropdowns for ECC, Size, Format */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Error Correction
            </label>
            <select
              value={ecc}
              onChange={(e) => {
                setEcc(e.target.value);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value="M">M — Medium (~15%)</option>
              <option value="L">L — Low (~7%)</option>
              <option value="Q">Q — Quartile (~25%)</option>
              <option value="H">H — High (~30%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Output Dimension
            </label>
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value={200}>200 × 200 px (Compact)</option>
              <option value={400}>400 × 400 px (Standard)</option>
              <option value={600}>600 × 600 px (High-Res)</option>
              <option value={800}>800 × 800 px (Print 300DPI)</option>
              <option value={1200}>1200 × 1200 px (Ultra-HD)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Image Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => {
                setOutputFormat(e.target.value);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value="PNG">PNG (Raster Bitmap)</option>
              <option value="SVG">SVG (Vector Markup)</option>
              <option value="BOTH">PNG + SVG (Dual)</option>
            </select>
          </div>
        </div>

        {/* Primary Action Button: Generate & Verify QR Code */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => executeGenerate(activeType, fields)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 stroke-[2.4]" />
            )}
            <span>Generate & Verify QR Code</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

      </div>

      {/* Right Card: QR Code Preview */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-4 sticky top-6">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            QR Code Preview
          </h3>
        </div>

        {/* Main Canvas Area */}
        <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-6 min-h-[340px] flex flex-col items-center justify-center text-center relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
              <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
              <span className="text-xs font-medium">Generating & verifying...</span>
            </div>
          ) : qrResult?.png_data_url ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/80">
                <img
                  src={qrResult.png_data_url}
                  alt="Generated QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {qrResult.target_size} × {qrResult.target_size} px • Version {qrResult.version} • ECC {qrResult.ecc}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-xs text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                <QrCode className="w-8 h-8" />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Fill in the details on the left and click "Generate & Verify QR Code"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {qrResult && (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadFile(qrResult.png_data_url, `qrcode-${activeType}.png`, 'image/png')}
                className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => downloadFile(qrResult.svg_markup, `qrcode-${activeType}.svg`, 'image/svg+xml')}
                disabled={!qrResult.svg_markup}
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>Download SVG</span>
              </button>
            </div>

            <button
              onClick={copyPayload}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2 px-3 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedPayload ? 'Payload Copied!' : 'Copy Decoded Payload'}</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
