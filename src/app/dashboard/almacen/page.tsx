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
  category: string | null;
  batchNumber: string | null;
  expirationDate: string | null;
  supplier: string | null;
  location: string | null;
  stock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
  services?: Array<{
    id: string;
    quantity: number;
    service: {
      id: string;
      name: string;
      price: number;
    };
  }>;
}

interface Transaction {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number | null;
  newStock: number | null;
  batchNumber: string | null;
  expirationDate: string | null;
  costPrice: number | null;
  invoiceRef: string | null;
  supplier: string | null;
  notes: string | null;
  clinicId: string;
  userId: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    category?: string | null;
    costPrice?: number;
    salePrice?: number;
  } | null;
  user?: {
    id: string;
    name: string;
    lastName: string | null;
    email?: string;
  } | null;
}

const COMMON_SUPPLIERS = [
  "Allergan / AbbVie",
  "Galderma",
  "Teoxane Laboratories",
  "Merz Aesthetics",
  "Mesoestetic",
  "Croma-Pharma",
  "B. Braun Medical",
  "Becton Dickinson (BD)",
  "Sinclair Pharma",
  "IBSA Derma",
  "Laboratorios Cantabria Labs",
  "ISDIN",
  "Normon Sanidad",
];

const CATEGORIES = [
  { id: "all", label: "Todas las categorías" },
  { id: "CONSUMIBLE", label: "Consumibles Clínicos" },
  { id: "VENTA_DIRECTA", label: "Venta Mostrador / TPV" },
  { id: "MEDICAMENTO", label: "Fármacos / Inyectables" },
  { id: "MATERIAL_QUIRURGICO", label: "Material Quirúrgico / Instrumental" },
];

export default function AlmacenPage() {
  const { user, activeClinic, language } = useApp();

  const showGanancias = useMemo(() => {
    return user?.role === "ADMIN" || hasPermission(user, "contabilidad", "Artículos - Ver Ganancias");
  }, [user]);

  // Tab State: "productos" | "trazabilidad" | "transacciones"
  const [activeTab, setActiveTab] = useState<"productos" | "trazabilidad" | "transacciones">("productos");

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "optimal" | "out">("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "expired" | "soon_30" | "soon_90">("all");
  const [searchTxQuery, setSearchTxQuery] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Modals
  // 1. Create/Edit Master Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("CONSUMIBLE");
  const [formBatchNumber, setFormBatchNumber] = useState("");
  const [formExpirationDate, setFormExpirationDate] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formMinStock, setFormMinStock] = useState("0");
  const [formCostPrice, setFormCostPrice] = useState("0");
  const [formSalePrice, setFormSalePrice] = useState("0");
  const [productError, setProductError] = useState<string | null>(null);

  // 2. Stock Reception Modal (ENTRADA)
  const [showEntryModal, setShowEntryModal] = useState<Product | null>(null);
  const [entryQty, setEntryQty] = useState("");
  const [entryCost, setEntryCost] = useState("");
  const [entryBatch, setEntryBatch] = useState("");
  const [entryExpDate, setEntryExpDate] = useState("");
  const [entrySupplier, setEntrySupplier] = useState("");
  const [entryInvoiceRef, setEntryInvoiceRef] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);

  // 3. Stock Adjustment Modal (AJUSTE)
  const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<"delta" | "target">("delta");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustTargetStock, setAdjustTargetStock] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // 4. Waste / Merma Modal (ROTURA_MERMA)
  const [showWasteModal, setShowWasteModal] = useState<Product | null>(null);
  const [wasteQty, setWasteQty] = useState("");
  const [wasteReason, setWasteReason] = useState("Caducidad vencida (desecho sanitario)");
  const [wasteNotes, setWasteNotes] = useState("");
  const [wasteError, setWasteError] = useState<string | null>(null);

  // Fetch Products
  const fetchProducts = async () => {
    if (!activeClinic) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/inventory?clinicId=${activeClinic.id}&search=${encodeURIComponent(searchQuery)}`);
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

  // Helper for Sanitary Date Evaluation
  const evaluateSanitaryStatus = (expDateStr: string | null) => {
    if (!expDateStr) return { status: "NONE", label: "Sin caducidad", className: "", days: null };
    const exp = new Date(expDateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "EXPIRED",
        label: `⛔ Caducado (hace ${Math.abs(diffDays)}d)`,
        className: styles.expiryExpired,
        days: diffDays,
        formattedDate: exp.toLocaleDateString("es-ES"),
      };
    }
    if (diffDays <= 30) {
      return {
        status: "URGENT",
        label: `⏳ Vence en ${diffDays}d`,
        className: styles.expiryUrgent,
        days: diffDays,
        formattedDate: exp.toLocaleDateString("es-ES"),
      };
    }
    if (diffDays <= 90) {
      return {
        status: "WARNING",
        label: `⚠️ Vence en ${diffDays}d`,
        className: styles.expiryWarning,
        days: diffDays,
        formattedDate: exp.toLocaleDateString("es-ES"),
      };
    }
    return {
      status: "VALID",
      label: `✓ Vence ${exp.toLocaleDateString("es-ES")}`,
      className: styles.expiryValid,
      days: diffDays,
      formattedDate: exp.toLocaleDateString("es-ES"),
    };
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const totalItems = products.length;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let criticalItems = 0;
    let outOfStockItems = 0;
    let expiredItems = 0;
    let urgentItems = 0;
    let warningItems = 0;

    products.forEach((p) => {
      const stock = Math.max(0, p.stock);
      const cost = Math.max(0, p.costPrice || 0);
      const sale = Math.max(0, p.salePrice || 0);

      totalCostValuation += stock * cost;
      totalRetailValuation += stock * (sale > 0 ? sale : cost);

      if (p.stock <= p.minStock) {
        criticalItems++;
      }
      if (p.stock === 0) {
        outOfStockItems++;
      }

      if (p.expirationDate) {
        const sanitary = evaluateSanitaryStatus(p.expirationDate);
        if (sanitary.status === "EXPIRED") expiredItems++;
        if (sanitary.status === "URGENT") urgentItems++;
        if (sanitary.status === "WARNING") warningItems++;
      }
    });

    const averageMarginPct =
      totalRetailValuation > 0
        ? Math.max(0, ((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 100)
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTxCount = transactions.filter(
      (tx) => new Date(tx.createdAt).getTime() >= thirtyDaysAgo.getTime()
    ).length;

    return {
      totalItems,
      totalCostValuation,
      totalRetailValuation,
      averageMarginPct,
      criticalItems,
      outOfStockItems,
      expiredItems,
      urgentItems,
      warningItems,
      totalSanitaryAlerts: expiredItems + urgentItems,
      recentTxCount,
    };
  }, [products, transactions]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== "all" && p.category !== categoryFilter) {
        return false;
      }

      // Stock status filter
      const isCritical = p.stock <= p.minStock;
      const isOut = p.stock === 0;
      if (stockFilter === "low" && !isCritical) return false;
      if (stockFilter === "optimal" && (isCritical || isOut)) return false;
      if (stockFilter === "out" && !isOut) return false;

      // Expiry filter
      if (expiryFilter !== "all") {
        if (!p.expirationDate) return false;
        const sanitary = evaluateSanitaryStatus(p.expirationDate);
        if (expiryFilter === "expired" && sanitary.status !== "EXPIRED") return false;
        if (expiryFilter === "soon_30" && sanitary.status !== "URGENT") return false;
        if (expiryFilter === "soon_90" && sanitary.status !== "URGENT" && sanitary.status !== "WARNING") return false;
      }

      return true;
    });
  }, [products, categoryFilter, stockFilter, expiryFilter]);

  // Expired / Near Expiry products for sanitary tab
  const sanitaryAlertProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.expirationDate) return false;
        const sanitary = evaluateSanitaryStatus(p.expirationDate);
        return sanitary.status === "EXPIRED" || sanitary.status === "URGENT" || sanitary.status === "WARNING";
      })
      .sort((a, b) => {
        const dateA = new Date(a.expirationDate!).getTime();
        const dateB = new Date(b.expirationDate!).getTime();
        return dateA - dateB; // First Expired First
      });
  }, [products]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Operation Type filter
      if (txTypeFilter !== "all") {
        if (txTypeFilter === "ENTRADA" && !["ENTRADA", "ADD", "ENTRY"].includes(tx.type)) return false;
        if (txTypeFilter === "CONSUMO_CITA" && !["CONSUMO_CITA", "CONSUMPTION"].includes(tx.type)) return false;
        if (txTypeFilter === "VENTA_MOSTRADOR" && tx.type !== "VENTA_MOSTRADOR") return false;
        if (txTypeFilter === "AJUSTE" && !["AJUSTE", "REMOVE"].includes(tx.type)) return false;
        if (txTypeFilter === "ROTURA_MERMA" && tx.type !== "ROTURA_MERMA") return false;
        if (txTypeFilter === "DEVOLUCION" && !["DEVOLUCION", "RETURN"].includes(tx.type)) return false;
      }

      // Search text filter
      if (searchTxQuery.trim()) {
        const query = searchTxQuery.toLowerCase();
        const prodName = tx.product?.name?.toLowerCase() || "";
        const note = tx.notes?.toLowerCase() || "";
        const userName = tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.toLowerCase() : "";
        const batch = tx.batchNumber?.toLowerCase() || "";
        const ref = tx.invoiceRef?.toLowerCase() || "";
        const supp = tx.supplier?.toLowerCase() || "";
        if (
          !prodName.includes(query) &&
          !note.includes(query) &&
          !userName.includes(query) &&
          !batch.includes(query) &&
          !ref.includes(query) &&
          !supp.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, txTypeFilter, searchTxQuery]);

  // Open product form (Create / Edit)
  const openProductForm = (prod: Product | null = null) => {
    setProductError(null);
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormSku(prod.sku || "");
      setFormCategory(prod.category || "CONSUMIBLE");
      setFormBatchNumber(prod.batchNumber || "");
      setFormExpirationDate(prod.expirationDate ? prod.expirationDate.split("T")[0] : "");
      setFormSupplier(prod.supplier || "");
      setFormLocation(prod.location || "");
      setFormStock(String(prod.stock));
      setFormMinStock(String(prod.minStock));
      setFormCostPrice(String(prod.costPrice));
      setFormSalePrice(String(prod.salePrice || 0));
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormSku("");
      setFormCategory("CONSUMIBLE");
      setFormBatchNumber("");
      setFormExpirationDate("");
      setFormSupplier("");
      setFormLocation("");
      setFormStock("0");
      setFormMinStock("0");
      setFormCostPrice("0");
      setFormSalePrice("0");
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
      category: formCategory,
      batchNumber: formBatchNumber.trim() || null,
      expirationDate: formExpirationDate || null,
      supplier: formSupplier.trim() || null,
      location: formLocation.trim() || null,
      stock: parseInt(formStock, 10) || 0,
      minStock: parseInt(formMinStock, 10) || 0,
      costPrice: parseFloat(formCostPrice) || 0,
      salePrice: parseFloat(formSalePrice) || 0,
      clinicId: activeClinic.id,
      userId: user?.id || null,
    };

    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/inventory/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            sku: payload.sku,
            category: payload.category,
            batchNumber: payload.batchNumber,
            expirationDate: payload.expirationDate,
            supplier: payload.supplier,
            location: payload.location,
            minStock: payload.minStock,
            costPrice: payload.costPrice,
            salePrice: payload.salePrice,
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
        toast.success(editingProduct ? "Insumo actualizado con éxito" : "Insumo registrado en almacén");
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
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este producto del inventario? Esta acción es irreversible y eliminará su histórico y vínculos con servicios."
      )
    ) {
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
        toast.success("Insumo eliminado del almacén.");
      } else {
        toast.error("Error al eliminar el producto.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión.");
    }
  };

  // Open Entry Modal
  const openEntryModal = (prod: Product) => {
    setShowEntryModal(prod);
    setEntryQty("");
    setEntryCost(prod.costPrice > 0 ? String(prod.costPrice) : "");
    setEntryBatch(prod.batchNumber || "");
    setEntryExpDate(prod.expirationDate ? prod.expirationDate.split("T")[0] : "");
    setEntrySupplier(prod.supplier || "");
    setEntryInvoiceRef("");
    setEntryNotes("");
    setEntryError(null);
  };

  // Execute Entry (Recepción de Pedido)
  const executeStockEntry = async () => {
    if (!showEntryModal) return;
    setEntryError(null);
    const qty = parseInt(entryQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setEntryError("Ingresa una cantidad recibida válida (mayor a 0).");
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${showEntryModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "ENTRADA",
          incomingQty: qty,
          costPrice: entryCost ? parseFloat(entryCost) : showEntryModal.costPrice,
          batchNumber: entryBatch.trim() || showEntryModal.batchNumber,
          expirationDate: entryExpDate || showEntryModal.expirationDate,
          supplier: entrySupplier.trim() || showEntryModal.supplier,
          invoiceRef: entryInvoiceRef.trim() || null,
          notes: entryNotes.trim() || null,
          userId: user?.id || null,
        }),
      });

      if (res.ok) {
        setShowEntryModal(null);
        fetchProducts();
        if (activeTab === "transacciones") fetchTransactions();
        toast.success(`Entrada de ${qty} uds registrada correctamente.`);
      } else {
        const err = await res.json();
        setEntryError(err.error || "Error al registrar la entrada.");
      }
    } catch (e) {
      console.error(e);
      setEntryError("Error de conexión con el servidor.");
    }
  };

  // Open Adjustment Modal
  const openAdjustModal = (prod: Product) => {
    setShowAdjustModal(prod);
    setAdjustMode("delta");
    setAdjustQty("");
    setAdjustTargetStock(String(prod.stock));
    setAdjustReason("");
    setAdjustError(null);
  };

  // Execute Stock Adjustment
  const executeStockAdjustment = async () => {
    if (!showAdjustModal) return;
    setAdjustError(null);

    const payload: any = {
      actionType: "AJUSTE",
      adjustmentReason: adjustReason.trim() || null,
      userId: user?.id || null,
    };

    if (adjustMode === "target") {
      const target = parseInt(adjustTargetStock, 10);
      if (isNaN(target) || target < 0) {
        setAdjustError("Ingresa un stock real contado válido (≥ 0).");
        return;
      }
      payload.targetStock = target;
    } else {
      const delta = parseInt(adjustQty, 10);
      if (isNaN(delta) || delta === 0) {
        setAdjustError("Ingresa una cantidad de ajuste distinta de cero.");
        return;
      }
      payload.stockAdjustment = delta;
    }

    try {
      const res = await fetch(`/api/inventory/${showAdjustModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowAdjustModal(null);
        fetchProducts();
        if (activeTab === "transacciones") fetchTransactions();
        toast.success("Ajuste de inventario aplicado con éxito.");
      } else {
        const err = await res.json();
        setAdjustError(err.error || "Error al realizar ajuste.");
      }
    } catch (e) {
      console.error(e);
      setAdjustError("Error de conexión.");
    }
  };

  // Open Waste Modal
  const openWasteModal = (prod: Product) => {
    setShowWasteModal(prod);
    setWasteQty("");
    setWasteReason("Caducidad vencida (desecho sanitario)");
    setWasteNotes("");
    setWasteError(null);
  };

  // Execute Waste (ROTURA_MERMA)
  const executeWasteRegistration = async () => {
    if (!showWasteModal) return;
    setWasteError(null);
    const qty = parseInt(wasteQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setWasteError("Ingresa una cantidad a desechar mayor a cero.");
      return;
    }

    if (qty > showWasteModal.stock) {
      setWasteError(`No puedes dar de baja más unidades de las disponibles (${showWasteModal.stock} uds).`);
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${showWasteModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "ROTURA_MERMA",
          wasteQty: qty,
          wasteReason,
          notes: wasteNotes.trim() || null,
          userId: user?.id || null,
        }),
      });

      if (res.ok) {
        setShowWasteModal(null);
        fetchProducts();
        if (activeTab === "transacciones") fetchTransactions();
        toast.success(`Merma de ${qty} uds registrada en la bitácora.`);
      } else {
        const err = await res.json();
        setWasteError(err.error || "Error al registrar la merma.");
      }
    } catch (e) {
      console.error(e);
      setWasteError("Error de conexión.");
    }
  };

  // Export to Excel: Libro de Inventario Valorado
  const exportToExcel = async () => {
    if (products.length === 0) {
      toast.error("No hay productos para exportar.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const clinicName = activeClinic?.name || "Clínica Médica";
      const emissionDate = new Date().toLocaleString("es-ES");

      // 1. Hoja: Libro de Inventario Valorado
      const headerRows: any[][] = [
        ["LIBRO DE INVENTARIO VALORADO Y CONTROL SANITARIO"],
        [`CENTRO MÉDICO / CLÍNICA: ${clinicName.toUpperCase()}`],
        [`FECHA DE EMISIÓN: ${emissionDate}`],
        [],
        ["RESUMEN EJECUTIVO DE VALORACIÓN"],
        ["Total de Referencias:", stats.totalItems],
        ["Valor Total a Precio de Coste (€):", parseFloat(stats.totalCostValuation.toFixed(2))],
        ["Valor Total a Precio de Venta (€):", parseFloat(stats.totalRetailValuation.toFixed(2))],
        ["Margen Comercial Medio (%):", `${stats.averageMarginPct.toFixed(1)}%`],
        ["Referencias en Stock Bajo (< Mínimo):", stats.criticalItems],
        ["Referencias Caducadas / En Alerta:", stats.totalSanitaryAlerts],
        [],
        [
          "SKU",
          "Nombre del Insumo / Producto",
          "Categoría",
          "Laboratorio / Proveedor",
          "Nº de Lote Fabricante",
          "Fecha de Caducidad",
          "Estado Sanitario",
          "Ubicación en Clínica",
          "Stock Actual",
          "Stock Mínimo",
          "Coste Unitario (€)",
          "Valor Coste Total (€)",
          "PVP Unitario (€)",
          "Valor PVP Total (€)",
          "Margen Comercial (€)",
          "Margen Comercial (%)",
          "Estado Stock",
        ],
      ];

      products.forEach((p) => {
        const sanitary = evaluateSanitaryStatus(p.expirationDate);
        const isCritical = p.stock <= p.minStock;
        const totalCost = p.stock * (p.costPrice || 0);
        const totalPvp = p.stock * (p.salePrice || 0);
        const marginEur = (p.salePrice || 0) - (p.costPrice || 0);
        const marginPct = p.salePrice > 0 ? (marginEur / p.salePrice) * 100 : 0;
        const stockStatus = p.stock === 0 ? "Agotado" : isCritical ? "Stock Bajo" : "Óptimo";

        headerRows.push([
          p.sku || "-",
          p.name,
          p.category || "CONSUMIBLE",
          p.supplier || "-",
          p.batchNumber || "-",
          p.expirationDate ? p.expirationDate.split("T")[0] : "-",
          sanitary.status === "EXPIRED"
            ? "CADUCADO"
            : sanitary.status === "URGENT"
            ? "VENCE < 30 DÍAS"
            : sanitary.status === "WARNING"
            ? "VENCE < 90 DÍAS"
            : sanitary.status === "VALID"
            ? "VIGENTE"
            : "SIN CONTROL",
          p.location || "-",
          p.stock,
          p.minStock,
          parseFloat((p.costPrice || 0).toFixed(2)),
          parseFloat(totalCost.toFixed(2)),
          parseFloat((p.salePrice || 0).toFixed(2)),
          parseFloat(totalPvp.toFixed(2)),
          parseFloat(marginEur.toFixed(2)),
          `${marginPct.toFixed(1)}%`,
          stockStatus,
        ]);
      });

      const wsInventory = XLSX.utils.aoa_to_sheet(headerRows);
      XLSX.utils.book_append_sheet(wb, wsInventory, "Inventario Valorado");

      // 2. Hoja: Control de Lotes y Caducidades Sanitarias (AEMPS)
      if (sanitaryAlertProducts.length > 0) {
        const sanitaryRows: any[][] = [
          ["REGISTRO DE CONTROL SANITARIO Y TRAZABILIDAD DE LOTES (AEMPS)"],
          [`CENTRO: ${clinicName.toUpperCase()} - EMISIÓN: ${emissionDate}`],
          [],
          [
            "Insumo / Medicamento",
            "Nº de Lote",
            "Fecha Caducidad",
            "Días Restantes",
            "Estado Sanitario",
            "Unidades Disponibles",
            "Laboratorio",
            "Ubicación",
            "Acción Requerida",
          ],
        ];

        sanitaryAlertProducts.forEach((p) => {
          const sanitary = evaluateSanitaryStatus(p.expirationDate);
          const actionText =
            sanitary.status === "EXPIRED"
              ? "RETIRAR Y DESTRUIR / REGISTRAR MERMA"
              : sanitary.status === "URGENT"
              ? "USO PRIORITARIO (REGLA FEFO) O DEVOLVER"
              : "MONITORIZAR ROTACIÓN";

          sanitaryRows.push([
            p.name,
            p.batchNumber || "NO REGISTRADO",
            p.expirationDate ? p.expirationDate.split("T")[0] : "-",
            sanitary.days !== null ? sanitary.days : "-",
            sanitary.label,
            p.stock,
            p.supplier || "-",
            p.location || "-",
            actionText,
          ]);
        });

        const wsSanitary = XLSX.utils.aoa_to_sheet(sanitaryRows);
        XLSX.utils.book_append_sheet(wb, wsSanitary, "Alertas Caducidad AEMPS");
      }

      const fileClinic = clinicName.replace(/\s+/g, "_");
      const filename = `Inventario_Valorado_${fileClinic}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Libro de inventario exportado a Excel.");
    } catch (e) {
      console.error("Error exporting to Excel:", e);
      toast.error("Error al exportar a Excel.");
    }
  };

  // Export Transactions History
  const exportTransactionsToExcel = async () => {
    if (transactions.length === 0) {
      toast.error("No hay movimientos registrados para exportar.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const txRows: any[][] = [
        ["LIBRO DIARIO DE MOVIMIENTOS Y AUDITORÍA DE ALMACÉN"],
        [`CLÍNICA: ${(activeClinic?.name || "Clínica").toUpperCase()} - FECHA: ${new Date().toLocaleString("es-ES")}`],
        [],
        [
          "Fecha y Hora",
          "Insumo / Producto",
          "Tipo de Operación",
          "Cantidad",
          "Stock Anterior",
          "Stock Resultante",
          "Nº Lote",
          "Fecha Caducidad",
          "Coste Unitario (€)",
          "Nº Albarán / Factura",
          "Proveedor / Laboratorio",
          "Usuario Responsable",
          "Notas / Concepto",
        ],
      ];

      filteredTransactions.forEach((tx) => {
        let typeText = tx.type;
        if (["ENTRADA", "ADD", "ENTRY"].includes(tx.type)) typeText = "Entrada de Stock";
        else if (["CONSUMO_CITA", "CONSUMPTION"].includes(tx.type)) typeText = "Consumo en Cita";
        else if (tx.type === "VENTA_MOSTRADOR") typeText = "Venta en Mostrador";
        else if (["AJUSTE", "REMOVE"].includes(tx.type)) typeText = "Ajuste de Inventario";
        else if (tx.type === "ROTURA_MERMA") typeText = "Merma / Rotura";
        else if (["DEVOLUCION", "RETURN"].includes(tx.type)) typeText = "Devolución / Restock";

        txRows.push([
          new Date(tx.createdAt).toLocaleString("es-ES"),
          tx.product?.name || "Producto eliminado",
          typeText,
          tx.quantity,
          tx.previousStock !== null ? tx.previousStock : "-",
          tx.newStock !== null ? tx.newStock : "-",
          tx.batchNumber || "-",
          tx.expirationDate ? tx.expirationDate.split("T")[0] : "-",
          tx.costPrice !== null ? tx.costPrice : "-",
          tx.invoiceRef || "-",
          tx.supplier || "-",
          tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.trim() : "Sistema Automático",
          tx.notes || "-",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, ws, "Movimientos");

      const fileClinic = (activeClinic?.name || "Clinica").replace(/\s+/g, "_");
      const filename = `Movimientos_Almacen_${fileClinic}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Histórico de movimientos exportado a Excel.");
    } catch (e) {
      console.error("Error exporting transactions:", e);
      toast.error("Error al exportar bitácora a Excel.");
    }
  };

  return (
    <div className={styles.container}>
      {/* Title & Tabs Header */}
      <div className={styles.headerArea}>
        <div>
          <h2 className={styles.titleText}>📦 {translate("warehouseInventory", language)}</h2>
          <p className={styles.subTitleText}>
            Control integral de existencias, trazabilidad sanitaria de lotes (AEMPS), valoración económica y auditoría de consumos.
          </p>
        </div>

        <div className={styles.tabControls}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "productos" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("productos")}
          >
            📦 Catálogo y Existencias
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "trazabilidad" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("trazabilidad")}
            style={{ position: "relative" }}
          >
            🚨 Lotes y Caducidades
            {stats.totalSanitaryAlerts > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  padding: "1px 6px",
                  fontSize: "11px",
                  borderRadius: "99px",
                  background: stats.expiredItems > 0 ? "#ef4444" : "#f59e0b",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                {stats.totalSanitaryAlerts}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "transacciones" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("transacciones")}
          >
            📋 Libro de Movimientos
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
            <span className={styles.kpiLabel}>Total Referencias</span>
            <span className={styles.kpiValue}>{stats.totalItems}</span>
          </div>
        </div>

        {showGanancias && (
          <>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIconWrapper} style={{ background: "linear-gradient(135deg, #0f766e, #134e4a)" }}>
                €
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Valor a Coste</span>
                <span className={styles.kpiValue}>{stats.totalCostValuation.toFixed(2)} €</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIconWrapper} style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                🏷️
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Valor a PVP</span>
                <span className={styles.kpiValue}>{stats.totalRetailValuation.toFixed(2)} €</span>
                <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>
                  Margen: {stats.averageMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        )}

        <div
          className={styles.kpiCard}
          style={{
            borderLeft: stats.criticalItems > 0 ? "4px solid #ef4444" : undefined,
            cursor: "pointer",
          }}
          onClick={() => {
            setActiveTab("productos");
            setStockFilter("low");
          }}
          title="Ver productos con stock bajo"
        >
          <div
            className={styles.kpiIconWrapper}
            style={{
              background:
                stats.criticalItems > 0
                  ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                  : "linear-gradient(135deg, #10b981, #047857)",
            }}
          >
            {stats.criticalItems > 0 ? "⚠️" : "✓"}
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Stock Bajo / Crítico</span>
            <span className={styles.kpiValue} style={{ color: stats.criticalItems > 0 ? "#ef4444" : undefined }}>
              {stats.criticalItems}
            </span>
          </div>
        </div>

        <div
          className={styles.kpiCard}
          style={{
            borderLeft: stats.totalSanitaryAlerts > 0 ? "4px solid #f59e0b" : undefined,
            cursor: "pointer",
          }}
          onClick={() => setActiveTab("trazabilidad")}
          title="Ver alertas de caducidad"
        >
          <div
            className={styles.kpiIconWrapper}
            style={{
              background:
                stats.expiredItems > 0
                  ? "linear-gradient(135deg, #dc2626, #991b1b)"
                  : stats.urgentItems > 0
                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                  : "linear-gradient(135deg, #10b981, #059669)",
            }}
          >
            {stats.expiredItems > 0 ? "⛔" : stats.urgentItems > 0 ? "⏳" : "🛡️"}
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Alertas Sanidad (AEMPS)</span>
            <span
              className={styles.kpiValue}
              style={{
                color: stats.expiredItems > 0 ? "#ef4444" : stats.urgentItems > 0 ? "#d97706" : undefined,
              }}
            >
              {stats.totalSanitaryAlerts}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
              {stats.expiredItems} caducados / {stats.urgentItems} ≤30d
            </span>
          </div>
        </div>
      </div>

      {/* Sanitary Alert Banner if critical items exist */}
      {stats.totalSanitaryAlerts > 0 && activeTab === "productos" && (
        <div className={styles.sanitaryBanner}>
          <div className={styles.sanitaryBannerContent}>
            <div className={styles.sanitaryBannerIcon}>🚨</div>
            <div>
              <div className={styles.sanitaryBannerTitle}>
                Atención Sanitaria: Existen {stats.totalSanitaryAlerts} producto(s) en riesgo de vencimiento
              </div>
              <p className={styles.sanitaryBannerDesc}>
                {stats.expiredItems > 0 && `• ${stats.expiredItems} lote(s) ya han caducado y deben ser retirados de consulta. `}
                {stats.urgentItems > 0 && `• ${stats.urgentItems} lote(s) caducan en los próximos 30 días (aplicar regla FEFO).`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab("trazabilidad")}
            style={{ whiteSpace: "nowrap" }}
          >
            Gestionar Lotes AEMPS ➔
          </button>
        </div>
      )}

      {/* =========================================================
          TAB 1: PRODUCTOS E INSUMOS
          ========================================================= */}
      {activeTab === "productos" && (
        <>
          {/* Filters & Actions Bar */}
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className="input"
                placeholder="Buscar por insumo, SKU, lote o laboratorio..."
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
                title="Descargar libro de inventario valorado con desglose de coste, PVP y lotes"
              >
                <Icons.Download size={16} /> Libro Valorado Excel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openProductForm(null)}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                + Nuevo Insumo
              </button>
            </div>
          </div>

          {/* Category Chips and Subfilters */}
          <div className={styles.chipsRow} style={{ justifyContent: "space-between", gap: "12px" }}>
            <div className={styles.filterChips}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.filterChip} ${categoryFilter === cat.id ? styles.filterChipActive : ""}`}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className={styles.filterChips}>
              <button
                type="button"
                className={`${styles.filterChip} ${stockFilter === "all" && expiryFilter === "all" ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setStockFilter("all");
                  setExpiryFilter("all");
                }}
              >
                Todos
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${stockFilter === "low" ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setStockFilter(stockFilter === "low" ? "all" : "low");
                  setExpiryFilter("all");
                }}
              >
                Stock Bajo ⚠️
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${stockFilter === "out" ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setStockFilter(stockFilter === "out" ? "all" : "out");
                  setExpiryFilter("all");
                }}
              >
                Sin Stock 🚨
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${expiryFilter === "soon_30" ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setExpiryFilter(expiryFilter === "soon_30" ? "all" : "soon_30");
                  setStockFilter("all");
                }}
              >
                Vence ≤ 30d ⏳
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${expiryFilter === "expired" ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setExpiryFilter(expiryFilter === "expired" ? "all" : "expired");
                  setStockFilter("all");
                }}
              >
                Caducados ⛔
              </button>
            </div>
          </div>

          {/* Grid Products */}
          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)" }}>
              Cargando catálogo e insumos clínicos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
              <h3>No se encontraron insumos</h3>
              <p style={{ margin: "4px 0 16px", color: "var(--text-muted)" }}>
                No hay productos que coincidan con los filtros aplicados. Agrega uno nuevo o limpia tu búsqueda.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openProductForm(null)}>
                + Nuevo Insumo
              </button>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {filteredProducts.map((prod) => {
                const isCritical = prod.stock <= prod.minStock;
                const isOut = prod.stock === 0;
                const maxStock = Math.max(prod.stock, prod.minStock * 2, 1);
                const stockPct = Math.min(100, Math.round((prod.stock / maxStock) * 100));
                const sanitary = evaluateSanitaryStatus(prod.expirationDate);

                const marginEur = (prod.salePrice || 0) - (prod.costPrice || 0);
                const marginPct = prod.salePrice > 0 ? (marginEur / prod.salePrice) * 100 : 0;

                const categoryLabel =
                  prod.category === "VENTA_DIRECTA"
                    ? "Venta Mostrador"
                    : prod.category === "MEDICAMENTO"
                    ? "Fármaco"
                    : prod.category === "MATERIAL_QUIRURGICO"
                    ? "Quirúrgico"
                    : "Consumible";

                const categoryClass =
                  prod.category === "VENTA_DIRECTA"
                    ? styles.catVentaDirecta
                    : prod.category === "MEDICAMENTO"
                    ? styles.catFarmaco
                    : prod.category === "MATERIAL_QUIRURGICO"
                    ? styles.catQuirurgico
                    : styles.catConsumible;

                return (
                  <div
                    key={prod.id}
                    className={`${styles.productCard} ${isCritical ? styles.productCardCritical : ""}`}
                  >
                    {/* Header: Title + Category + SKU */}
                    <div className={styles.cardHeader}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                          <span className={`${styles.categoryBadge} ${categoryClass}`}>{categoryLabel}</span>
                          {prod.sku && <span className={styles.productSku}>{prod.sku}</span>}
                        </div>
                        <div className={styles.productTitle}>{prod.name}</div>
                        {prod.supplier && (
                          <div className={styles.supplierTag}>
                            <span>🏢 {prod.supplier}</span>
                            {prod.location && <span className={styles.locationTag}>• 📍 {prod.location}</span>}
                          </div>
                        )}
                      </div>

                      <span
                        className={`${styles.stockBadge} ${
                          isOut
                            ? styles.stockBadgeCritical
                            : isCritical
                            ? styles.stockBadgeCritical
                            : styles.stockBadgeOptimal
                        }`}
                      >
                        {isOut ? "🚨 Sin stock" : isCritical ? "⚠️ Stock bajo" : "✓ Óptimo"}
                      </span>
                    </div>

                    {/* Trazabilidad Sanitaria: Lote y Caducidad */}
                    <div className={styles.traceabilityTags}>
                      {prod.batchNumber ? (
                        <span className={styles.batchBadge} title="Lote del fabricante">
                          🏷️ {prod.batchNumber}
                        </span>
                      ) : (
                        <span className={styles.batchBadge} style={{ opacity: 0.6 }} title="Sin lote asignado">
                          🏷️ S/L
                        </span>
                      )}

                      {prod.expirationDate && (
                        <span className={`${styles.expiryBadge} ${sanitary.className}`} title={`Caducidad: ${sanitary.formattedDate}`}>
                          {sanitary.label}
                        </span>
                      )}
                    </div>

                    {/* Stock Gauge */}
                    <div className={styles.stockSection}>
                      <div className={styles.stockLabelRow}>
                        <span className={styles.stockLabel}>Stock Físico</span>
                        <span className={`${styles.stockCount} ${isCritical ? styles.stockCountCritical : ""}`}>
                          {prod.stock}{" "}
                          <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)" }}>
                            / mín. {prod.minStock}
                          </span>
                        </span>
                      </div>
                      <div className={styles.stockBarContainer}>
                        <div
                          className={styles.stockBar}
                          style={{
                            width: `${stockPct}%`,
                            background: isOut
                              ? "#ef4444"
                              : isCritical
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : "linear-gradient(90deg, #10b981, #059669)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Pricing and Margin Valuation */}
                    {showGanancias && (
                      <div className={styles.pricingGrid}>
                        <div className={styles.priceCol}>
                          <span className={styles.priceColLabel}>Coste</span>
                          <span className={styles.priceColValue}>{(prod.costPrice || 0).toFixed(2)} €</span>
                        </div>
                        <div className={styles.priceCol}>
                          <span className={styles.priceColLabel}>PVP</span>
                          <span className={styles.priceColValue}>{(prod.salePrice || 0).toFixed(2)} €</span>
                        </div>
                        <div className={styles.priceCol}>
                          <span className={styles.priceColLabel}>Margen</span>
                          <span className={`${styles.priceColValue} ${styles.marginValue}`}>
                            {marginEur.toFixed(2)} € ({marginPct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.cardActionButtons}>
                      <button
                        type="button"
                        className={styles.quickBtnEntry}
                        onClick={() => openEntryModal(prod)}
                        title="Registrar entrada de mercancía / recepción de pedido"
                      >
                        📥 + Entrada
                      </button>
                      <button
                        type="button"
                        className={styles.quickBtnWaste}
                        onClick={() => openWasteModal(prod)}
                        title="Registrar desecho por rotura, caducidad o merma"
                      >
                        🗑️ - Merma
                      </button>
                    </div>

                    <div className={styles.secondaryActionsRow}>
                      <button
                        type="button"
                        className={styles.adjustBtnSmall}
                        onClick={() => openAdjustModal(prod)}
                        title="Ajuste por recuento físico periódico"
                      >
                        ⚡ Ajuste
                      </button>
                      <button
                        type="button"
                        className={styles.editBtnSmall}
                        onClick={() => openProductForm(prod)}
                        title="Editar datos maestros del producto"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================================================
          TAB 2: TRAZABILIDAD SANITARIA Y CADUCIDADES (AEMPS)
          ========================================================= */}
      {activeTab === "trazabilidad" && (
        <>
          <div className={styles.sanitaryBanner} style={{ borderColor: "rgba(14, 165, 233, 0.3)" }}>
            <div className={styles.sanitaryBannerContent}>
              <div className={styles.sanitaryBannerIcon}>🛡️</div>
              <div>
                <div className={styles.sanitaryBannerTitle} style={{ color: "var(--text-primary)" }}>
                  Módulo de Seguridad del Paciente y Cumplimiento Normativo (AEMPS / Sanidad)
                </div>
                <p className={styles.sanitaryBannerDesc}>
                  Control obligatorio de lotes y fechas de vencimiento de productos sanitarios inyectables (toxinas, ácidos
                  hialurónicos, anestésicos y materiales biocompatibles). Aplica la regla <strong>FEFO</strong> (First
                  Expired, First Out).
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportToExcel}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Icons.Download size={16} /> Exportar Auditoría Sanitaria
            </button>
          </div>

          {sanitaryAlertProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
              <h3>Almacén Clínico en Óptimas Condiciones Sanitarias</h3>
              <p style={{ margin: "4px 0", color: "var(--text-secondary)" }}>
                No hay lotes caducados ni próximos a caducar en los siguientes 90 días.
              </p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Insumo Sanitario</th>
                    <th>Nº de Lote Fabricante</th>
                    <th>Fecha Caducidad</th>
                    <th>Estado Sanitario</th>
                    <th>Stock Disponible</th>
                    <th>Laboratorio</th>
                    <th>Ubicación</th>
                    <th style={{ textAlign: "right" }}>Acción Inmediata</th>
                  </tr>
                </thead>
                <tbody>
                  {sanitaryAlertProducts.map((prod) => {
                    const sanitary = evaluateSanitaryStatus(prod.expirationDate);
                    return (
                      <tr key={prod.id}>
                        <td>
                          <strong>{prod.name}</strong>
                          {prod.sku && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{prod.sku}</div>}
                        </td>
                        <td>
                          <span className={styles.batchBadge}>{prod.batchNumber || "NO REGISTRADO"}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{sanitary.formattedDate}</td>
                        <td>
                          <span className={`${styles.expiryBadge} ${sanitary.className}`}>{sanitary.label}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{prod.stock} uds</td>
                        <td>{prod.supplier || "-"}</td>
                        <td>{prod.location || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              className={styles.quickBtnWaste}
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => openWasteModal(prod)}
                            >
                              Dar de Baja (Merma)
                            </button>
                            <button
                              type="button"
                              className={styles.quickBtnEntry}
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => openEntryModal(prod)}
                            >
                              Renovar Lote
                            </button>
                          </div>
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

      {/* =========================================================
          TAB 3: MOVIMIENTOS Y AUDITORÍA
          ========================================================= */}
      {activeTab === "transacciones" && (
        <>
          {/* Search bar & Type filter */}
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper} style={{ flex: 1, maxWidth: "480px" }}>
              <input
                type="text"
                className="input"
                placeholder="Buscar por insumo, albarán, lote, notas o empleado..."
                value={searchTxQuery}
                onChange={(e) => setSearchTxQuery(e.target.value)}
                style={{ paddingLeft: "36px", width: "100%" }}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>

            <div className={styles.actionButtons}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={exportTransactionsToExcel}
                disabled={transactions.length === 0}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Icons.Download size={16} /> Descargar Bitácora Excel
              </button>
            </div>
          </div>

          <div className={styles.chipsRow}>
            <div className={styles.filterChips}>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "all" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("all")}
              >
                Todos los tipos
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "ENTRADA" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("ENTRADA")}
              >
                📥 Entradas (Recepción)
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "CONSUMO_CITA" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("CONSUMO_CITA")}
              >
                ⚙ Consumo en Consulta
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "VENTA_MOSTRADOR" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("VENTA_MOSTRADOR")}
              >
                🏷️ Venta en Mostrador
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "AJUSTE" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("AJUSTE")}
              >
                ⚡ Ajustes Físicos
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "ROTURA_MERMA" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("ROTURA_MERMA")}
              >
                🗑️ Mermas / Roturas
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${txTypeFilter === "DEVOLUCION" ? styles.filterChipActive : ""}`}
                onClick={() => setTxTypeFilter("DEVOLUCION")}
              >
                ↩ Devoluciones / Reintegros
              </button>
            </div>
          </div>

          {/* Audit log Table */}
          {loadingTransactions ? (
            <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)" }}>
              Cargando bitácora de movimientos y auditoría...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
              <h3>Sin movimientos registrados</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                No hay movimientos que coincidan con los criterios seleccionados.
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
                    <th>Cantidad</th>
                    <th>Flujo de Stock</th>
                    <th>Lote / Ref</th>
                    <th>Usuario Responsable</th>
                    <th>Concepto / Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isAdd = ["ENTRADA", "ADD", "ENTRY"].includes(tx.type);
                    const isWaste = tx.type === "ROTURA_MERMA";
                    const isSale = tx.type === "VENTA_MOSTRADOR";
                    const isConsumption = ["CONSUMO_CITA", "CONSUMPTION"].includes(tx.type);
                    const isAdjust = ["AJUSTE", "REMOVE"].includes(tx.type);
                    const isReturn = ["DEVOLUCION", "RETURN"].includes(tx.type);

                    let typeLabel = "Movimiento";
                    let badgeClass = styles.txTypeBadge;

                    if (isAdd) {
                      typeLabel = "📥 Entrada de Stock";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeEntryBadge}`;
                    } else if (isWaste) {
                      typeLabel = "🗑️ Merma / Rotura";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeWasteBadge}`;
                    } else if (isSale) {
                      typeLabel = "🏷️ Venta Mostrador";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeSaleBadge}`;
                    } else if (isConsumption) {
                      typeLabel = "⚙ Consumo Consulta";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeConsumption}`;
                    } else if (isAdjust) {
                      typeLabel = "⚡ Ajuste Físico";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeAdjustBadge}`;
                    } else if (isReturn) {
                      typeLabel = "↩ Devolución / Restock";
                      badgeClass = `${styles.txTypeBadge} ${styles.txTypeReturnBadge}`;
                    }

                    const sign = isAdd || isReturn ? "+" : "-";
                    const qtyColor = isAdd || isReturn ? "#10b981" : isWaste ? "#ef4444" : isSale ? "#9333ea" : "#3b82f6";

                    return (
                      <tr key={tx.id}>
                        <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {new Date(tx.createdAt).toLocaleString("es-ES")}
                        </td>
                        <td>
                          <strong>{tx.product?.name || "Producto eliminado"}</strong>
                          {tx.product?.sku && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tx.product.sku}</div>
                          )}
                        </td>
                        <td>
                          <span className={badgeClass}>{typeLabel}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: qtyColor, whiteSpace: "nowrap" }}>
                          {sign}
                          {tx.quantity} uds
                        </td>
                        <td>
                          {tx.previousStock !== null && tx.newStock !== null ? (
                            <span className={styles.stockFlowCell}>
                              <span className={styles.stockPrev}>{tx.previousStock}</span>
                              <span className={styles.stockArrow}>➔</span>
                              <span className={styles.stockNext}>{tx.newStock} uds</span>
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>-</span>
                          )}
                        </td>
                        <td>
                          {tx.batchNumber ? (
                            <span className={styles.batchBadge} style={{ fontSize: "10.5px" }}>
                              {tx.batchNumber}
                            </span>
                          ) : tx.invoiceRef ? (
                            <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                              Doc: {tx.invoiceRef}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>-</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-primary)" }}>
                          {tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.trim() : "Sistema Automático"}
                        </td>
                        <td style={{ color: "var(--text-secondary)", maxWidth: "280px" }}>
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

      {/* =========================================================
          MODAL 1: PRODUCT CREATION / EDITING
          ========================================================= */}
      {showProductModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowProductModal(false)}>
          <div className={`${styles.modalContent} ${styles.modalContentWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>
                  {editingProduct ? "Editar Ficha de Insumo / Producto" : "Nuevo Insumo en Inventario"}
                </h3>
                <p className={styles.modalSubtitle}>
                  {editingProduct
                    ? "Actualiza datos sanitarios, costes y parámetros de stock."
                    : "Registra un nuevo insumo clínico con trazabilidad por lote y caducidad."}
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
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                  {productError}
                </div>
              )}

              {/* Datalist for Suppliers */}
              <datalist id="common-suppliers">
                {COMMON_SUPPLIERS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Nombre del Insumo / Fármaco *</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. Botox 100U, Juvederm Voluma..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Categoría Clínica *</label>
                  <select
                    className={styles.modalSelect}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  >
                    <option value="CONSUMIBLE">Consumible Sanitario</option>
                    <option value="VENTA_DIRECTA">Producto de Venta en Mostrador / TPV</option>
                    <option value="MEDICAMENTO">Fármaco / Medicamento Inyectable</option>
                    <option value="MATERIAL_QUIRURGICO">Material Quirúrgico / Instrumental</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Código SKU / Referencia</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. SKU-BTX-100"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Laboratorio / Proveedor</label>
                  <input
                    type="text"
                    list="common-suppliers"
                    className={styles.modalInput}
                    placeholder="Ej. Allergan, Galderma..."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              </div>

              {/* Trazabilidad Sanitaria: Lote y Caducidad */}
              <div
                style={{
                  background: "var(--bg-input)",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px dashed var(--border-color)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  🛡️ Trazabilidad Sanitaria y Seguridad (AEMPS)
                </div>
                <div className={styles.formRow} style={{ marginBottom: 0 }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Nº de Lote del Fabricante</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder="Ej. LOT-2026-X81"
                      value={formBatchNumber}
                      onChange={(e) => setFormBatchNumber(e.target.value)}
                      style={{ paddingLeft: "14px", fontFamily: "monospace" }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Fecha de Caducidad</label>
                    <input
                      type="date"
                      className={styles.modalInput}
                      value={formExpirationDate}
                      onChange={(e) => setFormExpirationDate(e.target.value)}
                      style={{ paddingLeft: "14px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Stock and Limits */}
              <div className={styles.formRow}>
                {!editingProduct && (
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Stock Inicial (Uds) *</label>
                    <input
                      type="number"
                      min="0"
                      className={styles.modalInput}
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      style={{ paddingLeft: "14px" }}
                    />
                  </div>
                )}

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Stock Mínimo de Alerta *</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.modalInput}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Ubicación Física</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. Nevera 1, Armario B..."
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              </div>

              {/* Pricing Section */}
              {showGanancias && (
                <div className={styles.formRow} style={{ marginTop: "14px" }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Precio de Coste Unitario (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.modalInput}
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      style={{ paddingLeft: "14px" }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.formLabel}>Precio de Venta PVP (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.modalInput}
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(e.target.value)}
                      style={{ paddingLeft: "14px" }}
                    />
                  </div>
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
                {editingProduct ? "Guardar Cambios" : "Crear Insumo"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          MODAL 2: RECEPCIÓN DE PEDIDO / ENTRADA DE STOCK (ENTRADA)
          ========================================================= */}
      {showEntryModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowEntryModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>📥 Entrada de Stock / Recepción</h3>
                <p className={styles.modalSubtitle}>{showEntryModal.name}</p>
              </div>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setShowEntryModal(null)}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {entryError && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                  {entryError}
                </div>
              )}

              <div
                style={{
                  background: "var(--bg-input)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13.5px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Stock actual en almacén:</span>
                <strong style={{ color: "var(--text-primary)" }}>{showEntryModal.stock} uds</strong>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Cantidad Recibida *</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.modalInput}
                    placeholder="Ej. 10"
                    value={entryQty}
                    onChange={(e) => setEntryQty(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Coste Unitario Compra (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.modalInput}
                    placeholder="Ej. 45.00"
                    value={entryCost}
                    onChange={(e) => setEntryCost(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Nº Lote de Fabricación</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. LOT-2026-N2"
                    value={entryBatch}
                    onChange={(e) => setEntryBatch(e.target.value)}
                    style={{ paddingLeft: "14px", fontFamily: "monospace" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Fecha de Caducidad</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={entryExpDate}
                    onChange={(e) => setEntryExpDate(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Nº Albarán / Factura</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. ALB-2026-904"
                    value={entryInvoiceRef}
                    onChange={(e) => setEntryInvoiceRef(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.formLabel}>Proveedor / Laboratorio</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Ej. Allergan, Galderma..."
                    value={entrySupplier}
                    onChange={(e) => setEntrySupplier(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: "14px", marginBottom: 0 }}>
                <label className={styles.formLabel}>Notas de Entrada</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  placeholder="Ej. Pedido regular de reposición mensual..."
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowEntryModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalBtnSave}
                style={{ background: "#10b981" }}
                onClick={executeStockEntry}
              >
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          MODAL 3: AJUSTE DE INVENTARIO / RECUENTO FÍSICO (AJUSTE)
          ========================================================= */}
      {showAdjustModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowAdjustModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>⚡ Ajustar Existencias</h3>
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
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                  {adjustError}
                </div>
              )}

              <div
                style={{
                  background: "var(--bg-input)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13.5px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Stock actual en sistema:</span>
                <strong style={{ color: "var(--text-primary)" }}>{showAdjustModal.stock} uds</strong>
              </div>

              {/* Mode switch: delta vs target */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button
                  type="button"
                  className={`${styles.filterChip} ${adjustMode === "delta" ? styles.filterChipActive : ""}`}
                  onClick={() => setAdjustMode("delta")}
                  style={{ flex: 1, padding: "8px 12px", textAlign: "center" }}
                >
                  Modificar (+/- uds)
                </button>
                <button
                  type="button"
                  className={`${styles.filterChip} ${adjustMode === "target" ? styles.filterChipActive : ""}`}
                  onClick={() => setAdjustMode("target")}
                  style={{ flex: 1, padding: "8px 12px", textAlign: "center" }}
                >
                  Fijar Recuento Real
                </button>
              </div>

              {adjustMode === "delta" ? (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Cantidad a sumar (+) o restar (-) *
                  </label>
                  <input
                    type="number"
                    className={styles.modalInput}
                    placeholder="Ej. +5 o -3"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Nuevo stock físico real contado en consulta *
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={styles.modalInput}
                    placeholder="Ej. 18"
                    value={adjustTargetStock}
                    onChange={(e) => setAdjustTargetStock(e.target.value)}
                    style={{ paddingLeft: "14px" }}
                  />
                </div>
              )}

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel}>Justificación del Ajuste</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  placeholder="Ej. Recuento periódico mensual, corrección de descuadre..."
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
                Aplicar Ajuste
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          MODAL 4: REGISTRO DE MERMA / ROTURA / VENCIMIENTO (ROTURA_MERMA)
          ========================================================= */}
      {showWasteModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowWasteModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleArea}>
                <h3 className={styles.modalTitle}>🗑️ Registro de Merma y Desecho Clínico</h3>
                <p className={styles.modalSubtitle}>{showWasteModal.name}</p>
              </div>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setShowWasteModal(null)}
              >
                <Icons.Close size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {wasteError && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                  {wasteError}
                </div>
              )}

              <div
                style={{
                  background: "var(--bg-input)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13.5px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Existencias actuales:</span>
                <strong style={{ color: "var(--text-primary)" }}>{showWasteModal.stock} uds</strong>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cantidad a Dar de Baja *</label>
                <input
                  type="number"
                  min="1"
                  max={showWasteModal.stock}
                  className={styles.modalInput}
                  placeholder="Ej. 1"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  style={{ paddingLeft: "14px" }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Motivo Clínico del Desecho *</label>
                <select
                  className={styles.modalSelect}
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  style={{ paddingLeft: "14px" }}
                >
                  <option value="Caducidad vencida (desecho sanitario)">Caducidad vencida (desecho sanitario)</option>
                  <option value="Rotura accidental de vial / jeringa">Rotura accidental de vial / jeringa</option>
                  <option value="Frasco contaminado / pérdida de esterilidad">Frasco contaminado / pérdida de esterilidad</option>
                  <option value="Sobrante no reutilizable tras tratamiento">Sobrante no reutilizable tras tratamiento</option>
                  <option value="Defecto de fabricación / embalaje">Defecto de fabricación / embalaje</option>
                  <option value="Otro motivo clínico">Otro motivo clínico</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel}>Observaciones Adicionales</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  placeholder="Detalles adicionales para la auditoría sanitaria..."
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowWasteModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalBtnSave}
                style={{ background: "#ef4444" }}
                onClick={executeWasteRegistration}
              >
                Dar de Baja
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
