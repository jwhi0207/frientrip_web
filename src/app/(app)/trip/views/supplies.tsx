"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToSupplies,
  subscribeToMembers,
  claimSupplyItem,
  addSupplyItem,
  deleteSupplyItem,
  updateSupplyItem,
  addHistoryEvent,
} from "@/lib/repositories";
import { SUPPLY_CATEGORIES, type SupplyItem, type TripMember } from "@/lib/models";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import {
  HiOutlinePlus,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineShoppingCart,
} from "react-icons/hi2";

export default function SuppliesView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user, profile } = useAuth();

  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>(SUPPLY_CATEGORIES[0]);
  const [newQuantity, setNewQuantity] = useState<string>("1");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<string>(SUPPLY_CATEGORIES[0]);
  const [editQuantity, setEditQuantity] = useState<string>("1");

  useEffect(() => {
    const unsubSupplies = subscribeToSupplies(tripId, (items: SupplyItem[]) => {
      setSupplies(items);
    });
    const unsubMembers = subscribeToMembers(tripId, (m: TripMember[]) => {
      setMembers(m);
    });
    return () => {
      unsubSupplies();
      unsubMembers();
    };
  }, [tripId]);

  const categories = SUPPLY_CATEGORIES as readonly string[];

  const groupedSupplies = categories.reduce<Record<string, SupplyItem[]>>((acc, cat) => {
    acc[cat] = supplies
      .filter((s) => s.category === cat)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {});

  // Include items with unknown categories under "Other"
  const knownCategories = categories;
  const uncategorized = supplies.filter((s) => !knownCategories.includes(s.category));
  if (uncategorized.length > 0) {
    groupedSupplies["Other"] = [...(groupedSupplies["Other"] || []), ...uncategorized];
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const getMemberByUid = (uid: string) => members.find((m) => m.uid === uid);

  const handleClaim = async (item: SupplyItem) => {
    if (!user || !profile) return;
    const isClaimed = item.claimedByUids.includes(user.uid);
    await claimSupplyItem(tripId, item.id, user.uid, profile.displayName, item);
    await addHistoryEvent(tripId, {
      category: "supplies",
      description: isClaimed
        ? `${profile.displayName} unclaimed "${item.name}"`
        : `${profile.displayName} claimed "${item.name}"`,
      timestamp: Date.now(),
    });
  };

  const handleAdd = async () => {
    if (!newName.trim() || !user || !profile) return;
    const sortOrder = supplies.filter((s) => s.category === newCategory).length;
    await addSupplyItem(tripId, {
      name: newName.trim(),
      category: newCategory,
      quantity: newQuantity,
      claimedByUids: [],
      claimedByName: "",
      sortOrder,
    });
    await addHistoryEvent(tripId, {
      category: "supplies",
      description: `${profile.displayName} added "${newName.trim()}" to supplies`,
      timestamp: Date.now(),
    });
    setNewName("");
    setNewCategory(SUPPLY_CATEGORIES[0]);
    setNewQuantity("1");
    setShowAddModal(false);
  };

  const handleDelete = async (item: SupplyItem) => {
    if (!profile) return;
    await deleteSupplyItem(tripId, item.id);
    await addHistoryEvent(tripId, {
      category: "supplies",
      description: `${profile.displayName} removed "${item.name}" from supplies`,
      timestamp: Date.now(),
    });
  };

  const openEdit = (item: SupplyItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditQuantity(item.quantity);
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editingItem || !editName.trim() || !profile) return;
    await updateSupplyItem(tripId, editingItem.id, {
      name: editName.trim(),
      category: editCategory,
      quantity: editQuantity,
    });
    await addHistoryEvent(tripId, {
      category: "supplies",
      description: `${profile.displayName} updated "${editingItem.name}" in supplies`,
      timestamp: Date.now(),
    });
    setShowEditModal(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <HiOutlineShoppingCart className="w-5 h-5" />
          Supplies
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {supplies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <HiOutlineShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No supplies added yet.</p>
          <p className="text-xs text-gray-400 mt-1">Tap &quot;Add Item&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const items = groupedSupplies[cat] || [];
            if (items.length === 0) return null;
            const isCollapsed = collapsedCategories.has(cat);

            return (
              <div key={cat} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <HiOutlineChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{cat}</span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {items.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {items.map((item) => {
                      const isClaimed = user ? item.claimedByUids.includes(user.uid) : false;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                              </span>
                              {item.quantity !== "1" && (
                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                  x{item.quantity}
                                </span>
                              )}
                            </div>
                            {item.claimedByUids.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {item.claimedByUids.map((uid) => {
                                  const member = getMemberByUid(uid);
                                  return member ? (
                                    <Avatar
                                      key={uid}
                                      displayName={member.displayName}
                                      avatarColor={member.avatarColor}
                                      size="sm"
                                    />
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleClaim(item)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                isClaimed
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {isClaimed ? (
                                <span className="flex items-center gap-1">
                                  <HiOutlineCheck className="w-3.5 h-3.5" />
                                  Claimed
                                </span>
                              ) : (
                                "Claim"
                              )}
                            </button>
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Supply Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Hot dogs, Paper plates..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="text"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Supply Item">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="text"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={!editName.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
