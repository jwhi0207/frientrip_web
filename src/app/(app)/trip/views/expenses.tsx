"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeToExpenses,
  subscribeToMembers,
  subscribeToTrip,
  addExpense,
  updateExpense,
  deleteExpense,
  addHistoryEvent,
} from "@/lib/repositories";
import { Trip, TripMember, SharedExpense } from "@/lib/models";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import {
  HiPlus,
  HiCheck,
  HiXMark,
  HiPencil,
  HiTrash,
  HiClock,
  HiCheckCircle,
  HiBanknotes,
} from "react-icons/hi2";

export default function ExpensesView() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"supply" | "misc">("supply");
  const [splitMethod, setSplitMethod] = useState<"even" | "byNights">("even");

  useEffect(() => {
    const unsub1 = subscribeToExpenses(tripId, (data: SharedExpense[]) => setExpenses(data));
    const unsub2 = subscribeToMembers(tripId, (data: TripMember[]) => setMembers(data));
    const unsub3 = subscribeToTrip(tripId, (data) => setTrip(data));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [tripId]);

  const isOwner = trip?.ownerId === user?.uid;

  const totalApproved = expenses
    .filter((e) => e.approved)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPending = expenses
    .filter((e) => !e.approved)
    .reduce((sum, e) => sum + e.amount, 0);

  const getMember = (uid: string) => members.find((m) => m.uid === uid);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("supply");
    setSplitMethod("even");
    setEditingExpense(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (expense: SharedExpense) => {
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setSplitMethod(expense.splitMethod);
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!user || !description.trim() || !amount) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const currentMember = getMember(user.uid);
    const submitterName = currentMember?.displayName || user.displayName || "Unknown";

    if (editingExpense) {
      await updateExpense(tripId, editingExpense.id, {
        description: description.trim(),
        amount: parsedAmount,
        category,
        splitMethod,
      });
      await addHistoryEvent(tripId, {
        category: "expenses",
        description: `${submitterName} updated expense "${description.trim()}"`,
        timestamp: Date.now(),
      });
    } else {
      await addExpense(tripId, {
        description: description.trim(),
        amount: parsedAmount,
        category,
        splitMethod,
        submittedByUid: user.uid,
        submittedByName: submitterName,
        approved: false,
        linkedSupplyId: "",
        createdAt: Date.now(),
      });
      await addHistoryEvent(tripId, {
        category: "expenses",
        description: `${submitterName} added expense "${description.trim()}" ($${parsedAmount.toFixed(2)})`,
        timestamp: Date.now(),
      });
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleToggleApprove = async (expense: SharedExpense) => {
    await updateExpense(tripId, expense.id, { approved: !expense.approved });
    const action = expense.approved ? "unapproved" : "approved";
    await addHistoryEvent(tripId, {
      category: "expenses",
      description: `Trip owner ${action} expense "${expense.description}"`,
      timestamp: Date.now(),
    });
  };

  const handleDelete = async (expense: SharedExpense) => {
    await deleteExpense(tripId, expense.id);
    await addHistoryEvent(tripId, {
      category: "expenses",
      description: `${expense.submittedByName} deleted expense "${expense.description}"`,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
            <HiCheckCircle className="w-4 h-4" />
            Approved
          </div>
          <div className="text-2xl font-bold text-green-800">
            ${totalApproved.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-1">
            <HiClock className="w-4 h-4" />
            Pending
          </div>
          <div className="text-2xl font-bold text-yellow-800">
            ${totalPending.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Add Expense Button */}
      <button
        onClick={openAddModal}
        className="flex items-center gap-2 w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <HiPlus className="w-4 h-4" />
        Add Expense
      </button>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <HiBanknotes className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No expenses yet</p>
          </div>
        )}
        {expenses.map((expense) => {
          const member = getMember(expense.submittedByUid);
          const canEdit = expense.submittedByUid === user?.uid;

          return (
            <div
              key={expense.id}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{expense.description}</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${expense.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {expense.approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      <HiCheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      <HiClock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
                  {expense.category}
                </span>
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                  {expense.splitMethod === "even" ? "Split Even" : "By Nights"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar
                    displayName={member?.displayName || expense.submittedByName}
                    avatarColor={member?.avatarColor ?? 0}
                    size="sm"
                  />
                  <span className="text-sm text-gray-600">
                    {expense.submittedByName}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {isOwner && (
                    <button
                      onClick={() => handleToggleApprove(expense)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        expense.approved
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={expense.approved ? "Unapprove" : "Approve"}
                    >
                      {expense.approved ? (
                        <HiXMark className="w-4 h-4" />
                      ) : (
                        <HiCheck className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => openEditModal(expense)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was the expense for?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="supply"
                  checked={category === "supply"}
                  onChange={() => setCategory("supply")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Supply</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="misc"
                  checked={category === "misc"}
                  onChange={() => setCategory("misc")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Misc</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split Method
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="splitMethod"
                  value="even"
                  checked={splitMethod === "even"}
                  onChange={() => setSplitMethod("even")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Even</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="splitMethod"
                  value="byNights"
                  checked={splitMethod === "byNights"}
                  onChange={() => setSplitMethod("byNights")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">By Nights</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || !amount}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingExpense ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
