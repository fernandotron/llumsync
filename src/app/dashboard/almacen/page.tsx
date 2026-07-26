"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "@/components/ToastContainer";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { translate } from "@/lib/translations";
import { hasPermission } from "@/lib/permissions";
import styles from "./Almacen.module.css";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  minStock: number;
  costPrice: number;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  productId: string;
  type: "ADD" | "REMOVE" | "CONSUMPTION";
  quantity: number;
  notes: string | null;
  clinicId: string;
  userId: string | null;
  createdAt: string;
  product?: {
    name: string;
  } | null;
  user?: {
    name: string;
    lastName: string | null;
  } | null;
}

export default function AlmacenPage() {
  const { user, activeClinic, language } = useApp();

  const showGanancias = useMemo(() => {
    return user?.role === "ADMIN" || hasPermission(user, "contabilidad", "Artículos - Ver Ganancias");
  }, [user]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"productos" | "transacciones">("productos");

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Filter / Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low" | "optimal" | "out">("all");
  const [searchTxQuery, setSearchTxQuery] = useState("");

  // Product Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formMinStock, setFormMinStock] = useState("0");
  const [formCostPrice, setFormCostPrice] = useState("0");
  const [productError, setProductError] = useState<string | null>(null);

  // Stock Adjust Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Fetch Products
  const fetchProducts = async () => {
    if (!activeClinic) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/inventory?clinicId=${activeClinic.id}&search=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Error fetching products:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async () => {
    if (!activeClinic) return;
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/inventory/transactions?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error("Error fetching transactions:", e);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Trigger loading products
  useEffect(() => {
    if (activeClinic) {
      fetchProducts();
    }
  }, [activeClinic, searchQuery]);

  // Trigger loading transactions when switching tabs
  useEffect(() => {
    if (activeClinic && activeTab === "transacciones") {
      fetchTransactions();
    }
  }, [activeClinic, activeTab]);

  // Statistics Computations
  const stats = useMemo(() => {
    const totalItems = products.length;
    let totalValuation = 0;
    let criticalItems = 0;

    products.forEach((p) => {
      totalValuation += p.stock * p.costPrice;
      if (p.stock <= p.minStock) {
        criticalItems++;
      }
    });

    // Count recent movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTxCount = transactions.filter(
      (tx) => new Date(tx.createdAt).getTime() >= thirtyDaysAgo.getTime()
    ).length;

    return {
      totalItems,
      totalValuation,
      criticalItems,
      recentTxCount,
    };
  }, [products, transactions]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isCritical = p.stock <= p.minStock;
      const isOut = p.stock === 0;

      if (filterType === "low") return isCritical;
      if (filterType === "optimal") return !isCritical && !isOut;
      if (filterType === "out") return isOut;
      return true;
    });
  }, [products, filterType]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!searchTxQuery) return transactions;
    const query = searchTxQuery.toLowerCase();
    return transactions.filter((tx) => {
      const prodName = tx.product?.name?.toLowerCase() || "";
      const note = tx.notes?.toLowerCase() || "";
      const userName = tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.toLowerCase() : "";
      return prodName.includes(query) || note.includes(query) || userName.includes(query);
    });
  }, [transactions, searchTxQuery]);

  // Open product form (Create / Edit)
  const openProductForm = (prod: Product | null = null) => {
    setProductError(null);
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormSku(prod.sku || "");
      setFormStock(String(prod.stock));
      setFormMinStock(String(prod.minStock));
      setFormCostPrice(String(prod.costPrice));
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormSku("");
      setFormStock("0");
      setFormMinStock("0");
      setFormCostPrice("0");
    }
    setShowProductModal(true);
  };

  // Save Product (Create / Edit)
  const saveProduct = async () => {
    setProductError(null);
    const nameVal = formName.trim();
    const skuVal = formSku.trim() || null;

    if (!nameVal || !activeClinic) {
      setProductError("El nombre del producto es obligatorio.");
      return;
    }

    const payload = {
      name: nameVal,
      sku: skuVal,
      stock: parseInt(formStock) || 0,
      minStock: parseInt(formMinStock) || 0,
      costPrice: parseFloat(formCostPrice) || 0,
      clinicId: activeClinic.id,
      userId: user?.id || null,
    };

    try {
      let res;
      if (editingProduct) {
        // Edit product updates name, sku, minStock, costPrice (stock is updated via adjustment modal)
        res = await fetch(`/api/inventory/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            sku: payload.sku,
            minStock: payload.minStock,
            costPrice: payload.costPrice,
            userId: user?.id || null,
          }),
        });
      } else {
        res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowProductModal(false);
        fetchProducts();
        if (activeTab === "transacciones") {
          fetchTransactions();
        }
      } else {
        const err = await res.json();
        setProductError(err.error || "Error al guardar el producto.");
      }
    } catch (e) {
      console.error(e);
      setProductError("Error de conexión con el servidor.");
    }
  };

  // Delete Product
  const deleteProduct = async (prodId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto del inventario? Esta acción es irreversible y afectará a las relaciones de servicios asociados.")) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/${prodId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowProductModal(false);
        fetchProducts();
        if (activeTab === "transacciones") {
          fetchTransactions();
        }
      } else {
        toast.success("Error al eliminar el producto.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión.");
    }
  };

  // Executing Stock Adjustment
  const executeStockAdjustment = async () => {
    if (!showAdjustModal || !adjustQty) return;
    setAdjustError(null);
    const adjustment = parseInt(adjustQty);

    if (isNaN(adjustment) || adjustment === 0) {
      setAdjustError("Ingresa una cantidad de ajuste válida (distinta de cero).");
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${showAdjustModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockAdjustment: adjustment,
          adjustmentReason: adjustReason.trim() || null,
          userId: user?.id || null,
        }),
      });

      if (res.ok) {
        setShowAdjustModal(null);
        setAdjustQty("");
        setAdjustReason("");
        fetchProducts();
        if (activeTab === "transacciones") {
          fetchTransactions();
        }
      } else {
        const err = await res.json();
        setAdjustError(err.error || "Error al realizar ajuste.");
      }
    } catch (e) {
      console.error(e);
      setAdjustError("Error de conexión.");
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (products.length === 0) return;
    try {
      const XLSX = await import("xlsx");
      
      const sheetData: any[][] = [
        ["INVENTARIO CLÍNICO - " + (activeClinic?.name || "LlumSync").toUpperCase()],
        ["Fecha de exportación", new Date().toLocaleDateString("es-ES")],
        [],
        ["SKU", "Nombre del Producto", "Stock Actual", "Stock Mínimo", "Precio de Coste (€)", "Valor Total (€)", "Estado"]
      ];

      products.forEach((p) => {
        const isCritical = p.stock <= p.minStock;
        const totalValue = p.stock * p.costPrice;
        const status = p.stock === 0 ? "Sin Stock" : isCritical ? "Stock Bajo" : "Óptimo";

        sheetData.push([
          p.sku || "-",
          p.name,
          p.stock,
          p.minStock,
          p.costPrice,
          totalValue,
          status
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      const fileClinicName = (activeClinic?.name || "Consultorio").replace(/\s+/g, "_");
      const filename = `Inventario_${fileClinicName}_${new Date().toISOString().split("T")[0]}.xlsx`;
      
      XLSX.writeFile(wb, filename);
    } catch (e) {
      console.error("Error exporting to Excel:", e);
      toast.error("Error al exportar a Excel.");
    }
  };

  return (
    <div className={styles.container}>
      {/* Title & Tabs */}
      <div className={styles.headerArea}>
        <div>
          <h2 className={styles.titleText}>📦 {translate("warehouseInventory", language)}</h2>
          <p className={styles.subTitleText}>
            Controla existencias, ajusta niveles críticos y valoriza los consumibles clínicos en tiempo real.
          </p>
        </div>

        <div className={styles.tabControls}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "productos" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("productos")}
          >
            Productos e Insumos
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "transacciones" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("transacciones")}
          >
            Movimientos y Auditoría
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
            📦
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Productos</span>
            <span className={styles.kpiValue}>{stats.totalItems}</span>
          </div>
        </div>

        {showGanancias && (
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ background: "linear-gradient(135deg, #0f766e, #134e4a)" }}>
              €
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Valor del Almacén</span>
              <span className={styles.kpiValue}>{stats.totalValuation.toFixed(2)} €</span>
            </div>
          </div>
        )}

        <div className={styles.kpiCard} style={{ borderLeft: stats.criticalItems > 0 ? "3px solid #ef4444" : undefined }}>
          <div className={styles.kpiIconWrapper} style={{ background: stats.criticalItems > 0 ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #10b981, #047857)" }}>
            {stats.criticalItems > 0 ? "⚠️" : "✓"}
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Stock Crítico</span>
            <span className={styles.kpiValue} style={{ color: stats.criticalItems > 0 ? "#ef4444" : undefined }}>
              {stats.criticalItems}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            🔄
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Movimientos (30d)</span>
            <span className={styles.kpiValue}>{stats.recentTxCount}</span>
          </div>
        </div>
      </div>

      {/* SUBTAB: PRODUCTOS */}
      {activeTab === "productos" && (
        <>
          {/* Filters and Search Bar */}
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className="input"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%" }}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>

            <div className={styles.actionButtons}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={exportToExcel}
                disabled={products.length === 0}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Icons.Download size={16} /> Excel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openProductForm(null)}
              >
                + Nuevo Producto
              </button>
            </div>
          </div>

          <div className={styles.chipsRow}>
            <div className={styles.filterChips}>
              <button
                type="button"
                className={`${styles.filterChip} ${filterType === "all" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("all")}
              >
                Todos
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterType === "low" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("low")}
              >
                Stock Bajo ⚠️
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterType === "optimal" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("optimal")}
              >
                Stock Óptimo
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${filterType === "out" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("out")}
              >
                Sin Stock 🚨
              </button>
            </div>
          </div>

          {/* Grid Products */}
          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)" }}>
              Cargando catálogo de productos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
              <h3>No se encontraron insumos</h3>
              <p style={{ margin: "4px 0 16px", color: "var(--text-muted)" }}>
                No hay productos en esta vista. Agrega uno nuevo o ajusta tus filtros.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openProductForm(null)}>
                + Nuevo Producto
              </button>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {filteredProducts.map((prod) => {
                const isCritical = prod.stock <= prod.minStock;
                const maxStock = Math.max(prod.stock, prod.minStock * 2, 1);
                const stockPct = Math.min(100, Math.round((prod.stock / maxStock) * 100));

                return (
                  <div
                    key={prod.id}
                    className={`${styles.productCard} ${isCritical ? styles.productCardCritical : ""}`}
                  >
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.productTitle}>{prod.name}</div>
                        {prod.sku && (
                          <span className={styles.productSku}>{prod.sku}</span>
                        )}
                      </div>
                      <span
                        className={`${styles.stockBadge} ${
                          isCritical ? styles.stockBadgeCritical : styles.stockBadgeOptimal
                        }`}
                      >
                        {isCritical ? "⚠️ Stock bajo" : "✓ Óptimo"}
                      </span>
                    </div>

                    <div className={styles.stockSection}>
                      <div className={styles.stockLabelRow}>
                        <span className={styles.stockLabel}>Stock Clínico</span>
                        <span className={`${styles.stockCount} ${isCritical ? styles.stockCountCritical : ""}`}>
                          {prod.stock} <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)" }}>/ mín. {prod.minStock}</span>
                        </span>
                      </div>
                      <div className={styles.stockBarContainer}>
                        <div
                          className={styles.stockBar}
                          style={{
                            width: `${stockPct}%`,
                            background: isCritical
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : "linear-gradient(90deg, #10b981, #059669)",
                          }}
                        />
                      </div>
                    </div>

                    {showGanancias && prod.costPrice != null && (
                      <div className={styles.pricingSection}>
                        <span className={styles.priceLabel}>Precio coste</span>
                        <span className={styles.priceValue}>{prod.costPrice.toFixed(2)} €</span>
                      </div>
                    )}

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.adjustBtn}
                        onClick={() => {
                          setShowAdjustModal(prod);
                          setAdjustQty("");
                          setAdjustReason("");
                          setAdjustError(null);
                        }}
                      >
                        ⚡ Ajustar Stock
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openProductForm(prod)}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SUBTAB: MOVIMIENTOS */}
      {activeTab === "transacciones" && (
        <>
          {/* Search bar for transactions */}
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper} style={{ flex: 1, maxWidth: "480px" }}>
              <input
                type="text"
                className="input"
                placeholder="Buscar por insumo, notas o empleado..."
                value={searchTxQuery}
                onChange={(e) => setSearchTxQuery(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%" }}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>
          </div>

          {/* Audit log Table */}
          {loadingTransactions ? (
            <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)" }}>
              Cargando bitácora de movimientos...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
              <h3>Sin movimientos registrados</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                Aún no hay entradas ni salidas en esta consulta.
              </p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Insumo / Producto</th>
                    <th>Tipo de Operación</th>
                    <th>Usuario</th>
                    <th style={{ textAlign: "center" }}>Cantidad</th>
                    <th>Concepto / Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isAdd = tx.type === "ADD";
                    const isRemove = tx.type === "REMOVE";
                    const typeLabel = isAdd ? "⬆ Entrada de stock" : isRemove ? "⬇ Salida manual" : "⚙ Consumo automático";
                    const typeClass = isAdd
                      ? styles.txTypeAdd
                      : isRemove
                      ? styles.txTypeRemove
                      : styles.txTypeConsumption;

                    return (
                      <tr key={tx.id}>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {new Date(tx.createdAt).toLocaleString("es-ES")}
                        </td>
                        <td>
                          <strong>{tx.product?.name || "Producto eliminado"}</strong>
                        </td>
                        <td>
                          <span className={`${styles.txTypeBadge} ${typeClass}`}>{typeLabel}</span>
                        </td>
                        <td>
                          {tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.trim() : "Sistema / Consumo"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          <span style={{ color: isAdd ? "#10b981" : isRemove ? "#ef4444" : "#3b82f6" }}>
                            {isAdd ? "+" : "-"}{tx.quantity} uds
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {tx.notes || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* PRODUCT CREATION/EDITING MODAL */}
      {showProductModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>
                  {editingProduct ? "Editar Insumo" : "Registrar Insumo en Inventario"}
                </h3>
                <p className={styles.modalSubtitle}>
                  {editingProduct
                    ? "Actualiza los límites críticos y datos de facturación del producto."
                    : "Agrega y define el stock inicial para registrar el nuevo insumo clínico."}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setShowProductModal(false)}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {productError && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "6px", marginBottom: "14px", fontSize: "13px" }}>
                  {productError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre del Insumo *</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <circle cx="7" cy="7" r=".5" fill="currentColor" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. Agujas Dry Needling, Toallas desechables..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Código SKU (Opcional)</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                      <line x1="10" y1="3" x2="8" y2="21" />
                      <line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. SKU-AG-304"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                  />
                </div>
              </div>

              {!editingProduct ? (
                <>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.formLabel}>Stock Inicial *</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                            <polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08" />
                            <polygon points="12 22.08 12 12 21 6.92 21 17.08 12 22.08" />
                            <polygon points="12 12 3 6.92 12 1.84 21 6.92 12 12" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={styles.modalInput}
                          value={formStock}
                          onChange={(e) => setFormStock(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.formLabel}>Stock Mínimo *</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          min="0"
                          className={styles.modalInput}
                          value={formMinStock}
                          onChange={(e) => setFormMinStock(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {showGanancias && (
                    <div className={styles.formGroup} style={{ marginTop: "18px" }}>
                      <label className={styles.formLabel}>Precio Unitario de Coste (€) *</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.modalInput}
                          value={formCostPrice}
                          onChange={(e) => setFormCostPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={showGanancias ? styles.formRow : styles.formGroup}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Stock Mínimo *</label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </span>
                      <input
                        type="number"
                        min="0"
                        className={styles.modalInput}
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                      />
                    </div>
                  </div>

                  {showGanancias && (
                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                      <label className={styles.formLabel}>Precio de Coste (€) *</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.modalInput}
                          value={formCostPrice}
                          onChange={(e) => setFormCostPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {editingProduct && (
                <button
                  type="button"
                  className={styles.modalBtnDelete}
                  onClick={() => deleteProduct(editingProduct.id)}
                >
                  Eliminar Insumo
                </button>
              )}

              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowProductModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalBtnSave}
                onClick={saveProduct}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>Ajustar Existencias</h3>
                <p className={styles.modalSubtitle}>{showAdjustModal.name}</p>
              </div>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setShowAdjustModal(null)}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {adjustError && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "6px", marginBottom: "14px", fontSize: "13px" }}>
                  {adjustError}
                </div>
              )}

              <div style={{
                background: "var(--bg-input)",
                padding: "14px 18px",
                borderRadius: "12px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--border-color)",
                fontSize: "13.5px"
              }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Existencias actuales:</span>
                <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{showAdjustModal.stock} uds</strong>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Cantidad a ajustar (número positivo para sumar, negativo para restar) *
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="Ej. +10 o -5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notas / Justificación del Ajuste</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={3}
                  placeholder="Ej. Rotura, Auditoría mensual, Compra a proveedor..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowAdjustModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalBtnSave}
                onClick={executeStockAdjustment}
              >
                Registrar Ajuste
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
