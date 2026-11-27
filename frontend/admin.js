(() => {
  const API = "https://radha-rani-studio.onrender.com/api/v1";
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("login-panel");
  const dashboard = $("dashboard");
  const state = {
    page: 1,
    pages: 1,
    bookings: [],
    packages: [],
    offlineTravel: null,
  };
  let offlineTravelTimer = null;
  let offlineTravelSeq = 0;

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(value))
      : "—";
  const todayIndia = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  function token() {
    return localStorage.getItem("token");
  }
  function setFeedback(message, target = "dashboard-feedback") {
    const element = $(target);
    if (element) element.textContent = message || "";
  }
  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    setFeedback(message, "login-feedback");
  }
  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }

  async function api(path, options = {}) {
    const headers = {
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    };
    if (options.body && !headers["Content-Type"])
      headers["Content-Type"] = "application/json";
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401)
      throw new Error("Your session has expired. Please sign in again.");
    if (response.status === 403)
      throw new Error("This account does not have administrator access.");
    if (!response.ok)
      throw new Error(data.message || "Unable to complete the request.");
    return data;
  }

  function collectedAmount(booking) {
    if (booking.amountPaid !== undefined && booking.amountPaid !== null)
      return Number(booking.amountPaid) || 0;
    return booking.paymentStatus === "paid" ? Number(booking.price) || 0 : 0;
  }

  function outstandingBalance(booking) {
    if (booking.balanceDue !== undefined && booking.balanceDue !== null)
      return Number(booking.balanceDue) || 0;
    return booking.paymentStatus === "paid"
      ? 0
      : Math.max((Number(booking.price) || 0) - collectedAmount(booking), 0);
  }

  function buildWhatsappNotice(receiptWhatsapp, phoneNumber = "") {
    if (!receiptWhatsapp) return "";
    if (receiptWhatsapp.sent) {
      return ` PDF receipt sent on WhatsApp${phoneNumber ? ` to ${phoneNumber}` : ""}.`;
    }
    if (receiptWhatsapp.reason === "disabled") {
      return " WhatsApp receipt automation is currently paused.";
    }
    if (receiptWhatsapp.reason === "no_phone") {
      return " No valid phone number was available for WhatsApp.";
    }
    return " WhatsApp receipt delivery failed. You can retry from the booking row.";
  }

  async function loadSummary() {
    const response = await api("/bookings/admin/summary");
    const d = response.data || {};
    $("stat-total").textContent = d.totalBookings || 0;
    $("stat-collected").textContent = money(d.amountCollected);
    $("stat-balance").textContent = money(d.balanceOutstanding);
    $("stat-full").textContent = d.fullyPaidBookings || 0;
    $("stat-partial").textContent = d.partiallyPaidBookings || 0;
    $("stat-upcoming").textContent = d.upcomingBookings || 0;
  }

  function addCell(row, content, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    row.append(cell);
    return cell;
  }

  function makeText(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = content;
    return element;
  }

  function renderBookings(bookings) {
    const tbody = $("booking-rows");
    tbody.replaceChildren();
    if (!bookings.length) {
      const row = document.createElement("tr");
      const cell = addCell(
        row,
        "No bookings match these filters.",
        "empty-state",
      );
      cell.colSpan = 11;
      tbody.append(row);
      return;
    }

    bookings.forEach((booking) => {
      const row = document.createElement("tr");
      const client = booking.user || booking.clientDetails || {};
      const pkg = booking.package || {};
      const clientBlock = document.createElement("div");
      clientBlock.append(
        makeText("span", "client-name", client.name || "Unknown client"),
        makeText("span", "client-email", client.email || "No email recorded"),
        makeText(
          "span",
          "client-phone",
          client.phoneNumber || "No phone recorded",
        ),
      );
      addCell(row, clientBlock);

      const source = booking.bookingSource || "online";
      addCell(
        row,
        makeText(
          "span",
          `source-badge source-${source}`,
          source === "offline" ? "Offline" : "Online",
        ),
      );
      addCell(row, pkg.name || "Package unavailable");
      addCell(row, date(booking.eventDate));

      const eventLocation = booking.eventLocation || {};
      const locationBlock = document.createElement("div");
      locationBlock.className = "event-location-block";
      locationBlock.append(
        makeText(
          "strong",
          "event-location-name",
          eventLocation.venueName || "Address not recorded",
        ),
      );
      const addressLines = [
        eventLocation.addressLine,
        eventLocation.locality,
        eventLocation.district,
        eventLocation.state,
        eventLocation.pinCode ? `PIN ${eventLocation.pinCode}` : "",
        eventLocation.landmark ? `Landmark: ${eventLocation.landmark}` : "",
        eventLocation.country || (eventLocation.venueName ? "India" : ""),
      ].filter(Boolean);
      if (addressLines.length)
        locationBlock.append(
          makeText("span", "event-location-address", addressLines.join(", ")),
        );
      addCell(row, locationBlock, "event-location-cell");

      const priceBlock = document.createElement("div");
      priceBlock.append(makeText("span", "", money(booking.price)));
      const travelCharge = Number(booking.travelCharge || 0);
      if (travelCharge > 0) {
        const basePrice =
          booking.basePackagePrice !== undefined &&
          booking.basePackagePrice !== null
            ? Number(booking.basePackagePrice)
            : Math.max((Number(booking.price) || 0) - travelCharge, 0);
        priceBlock.append(
          makeText(
            "small",
            "payment-choice-note",
            `Pkg ${money(basePrice)} + Travel ${money(travelCharge)}`,
          ),
        );
      }
      addCell(row, priceBlock);

      addCell(row, money(collectedAmount(booking)));
      addCell(row, money(outstandingBalance(booking)));

      const paymentStatus = booking.paymentStatus || "pending";
      const statusLabel = paymentStatus.replace(/_/g, " ");
      const paymentBlock = document.createElement("div");
      paymentBlock.append(
        makeText("span", `status status-${paymentStatus}`, statusLabel),
      );
      if (booking.initialPaymentChoice) {
        paymentBlock.append(
          makeText(
            "small",
            "payment-choice-note",
            booking.initialPaymentChoice === "full"
              ? "Full payment chosen"
              : "20% advance chosen",
          ),
        );
      }
      addCell(row, paymentBlock);

      const contactCell = document.createElement("td");
      const contactActions = document.createElement("div");
      contactActions.className = "contact-actions";
      if (client.email) {
        const emailLink = document.createElement("a");
        emailLink.className = "contact-link";
        emailLink.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent("Radha Rani Studio booking")}`;
        emailLink.textContent = "Email client ↗";
        contactActions.append(emailLink);
      }
      if (client.phoneNumber) {
        const phoneDigits = String(client.phoneNumber).replace(/\D/g, "");
        const whatsappNumber = phoneDigits.startsWith("91")
          ? phoneDigits
          : `91${phoneDigits.replace(/^0/, "")}`;
        const callLink = document.createElement("a");
        callLink.className = "contact-link";
        callLink.href = `tel:+${whatsappNumber}`;
        callLink.textContent = "Call client";
        const whatsappLink = document.createElement("a");
        whatsappLink.className = "contact-link";
        whatsappLink.href = `https://wa.me/${whatsappNumber}`;
        whatsappLink.target = "_blank";
        whatsappLink.rel = "noopener noreferrer";
        whatsappLink.textContent = "WhatsApp ↗";
        contactActions.append(callLink, whatsappLink);
      }
      if (contactActions.childElementCount) contactCell.append(contactActions);
      else contactCell.textContent = "No contact details";
      row.append(contactCell);

      const actionCell = document.createElement("td");
      const actionStack = document.createElement("div");
      actionStack.className = "row-actions";
      const isReceiptEligible = !["pending", "failed", "cancelled"].includes(
        paymentStatus,
      );

      if (
        outstandingBalance(booking) > 0 &&
        paymentStatus === "partially_paid"
      ) {
        const paymentButton = document.createElement("button");
        paymentButton.type = "button";
        paymentButton.className = "table-action-btn";
        paymentButton.textContent = "Record payment";
        paymentButton.addEventListener("click", () =>
          openPaymentModal(booking),
        );
        actionStack.append(paymentButton);
      }

      if (client.email && isReceiptEligible) {
        const emailGroup = document.createElement("div");
        emailGroup.className = "receipt-action-group";
        const emailLabel =
          booking.receiptEmailStatus === "sent"
            ? "Resend email PDF"
            : "Email PDF receipt";
        const receiptButton = document.createElement("button");
        receiptButton.type = "button";
        receiptButton.className = "table-action-btn";
        receiptButton.textContent = emailLabel;
        receiptButton.addEventListener("click", async () => {
          receiptButton.disabled = true;
          receiptButton.textContent = "Sending PDF…";
          try {
            const result = await api(
              `/bookings/admin/${encodeURIComponent(booking._id)}/email-receipt`,
              { method: "POST" },
            );
            setFeedback(
              result.message || `PDF receipt emailed to ${client.email}.`,
            );
            await loadBookings();
          } catch (error) {
            setFeedback(error.message);
            receiptButton.disabled = false;
            receiptButton.textContent = emailLabel;
          }
        });
        emailGroup.append(receiptButton);

        if (
          booking.receiptEmailStatus === "sent" &&
          booking.receiptEmailSentAt
        ) {
          emailGroup.append(
            makeText(
              "small",
              "payment-choice-note receipt-note-sent",
              `Emailed ${date(booking.receiptEmailSentAt)}`,
            ),
          );
        } else if (booking.receiptEmailStatus === "failed") {
          const errNote = makeText(
            "small",
            "payment-choice-note receipt-note-error",
            "Email failed — retry available",
          );
          if (booking.receiptEmailLastError)
            errNote.title = booking.receiptEmailLastError;
          emailGroup.append(errNote);
        }
        actionStack.append(emailGroup);
      } else if (!client.email) {
        actionStack.append(
          makeText("small", "payment-choice-note", "No email recorded"),
        );
      }

      if (client.phoneNumber && isReceiptEligible) {
        const waGroup = document.createElement("div");
        waGroup.className = "receipt-action-group";
        const waLabel =
          booking.receiptWhatsappStatus === "sent"
            ? "Resend WhatsApp PDF"
            : "WhatsApp PDF receipt";
        const waButton = document.createElement("button");
        waButton.type = "button";
        waButton.className = "table-action-btn table-action-btn-whatsapp";
        waButton.textContent = waLabel;
        waButton.addEventListener("click", async () => {
          waButton.disabled = true;
          waButton.textContent = "Sending WhatsApp…";
          try {
            const result = await api(
              `/bookings/admin/${encodeURIComponent(booking._id)}/whatsapp-receipt`,
              { method: "POST" },
            );
            setFeedback(
              result.message ||
                `PDF receipt sent on WhatsApp to ${client.phoneNumber}.`,
            );
            await loadBookings();
          } catch (error) {
            setFeedback(error.message);
            waButton.disabled = false;
            waButton.textContent = waLabel;
          }
        });
        waGroup.append(waButton);

        if (
          booking.receiptWhatsappStatus === "sent" &&
          booking.receiptWhatsappSentAt
        ) {
          waGroup.append(
            makeText(
              "small",
              "payment-choice-note receipt-note-sent",
              `WhatsApp sent ${date(booking.receiptWhatsappSentAt)}`,
            ),
          );
        } else if (booking.receiptWhatsappStatus === "failed") {
          const waErrNote = makeText(
            "small",
            "payment-choice-note receipt-note-error",
            "WhatsApp failed — retry available",
          );
          if (booking.receiptWhatsappLastError)
            waErrNote.title = booking.receiptWhatsappLastError;
          waGroup.append(waErrNote);
        } else if (booking.receiptWhatsappStatus === "disabled") {
          waGroup.append(
            makeText(
              "small",
              "payment-choice-note",
              "WhatsApp automation paused",
            ),
          );
        }
        actionStack.append(waGroup);
      } else if (!client.phoneNumber) {
        actionStack.append(
          makeText("small", "payment-choice-note", "No phone recorded"),
        );
      }

      if (actionStack.childElementCount) actionCell.append(actionStack);
      else actionCell.textContent = paymentStatus === "paid" ? "Complete" : "—";
      row.append(actionCell);
      tbody.append(row);
    });
  }

  async function loadBookings() {
    const params = new URLSearchParams({
      page: String(state.page),
      limit: "50",
    });
    if ($("status-filter").value)
      params.set("paymentStatus", $("status-filter").value);
    if ($("source-filter").value)
      params.set("bookingSource", $("source-filter").value);
    if ($("from-date").value) params.set("from", $("from-date").value);
    if ($("to-date").value) params.set("to", $("to-date").value);
    const response = await api(`/bookings/admin/all?${params}`);
    state.pages = response.pages || 1;
    state.bookings = response.data?.bookings || [];
    renderBookings(state.bookings);
    $("result-count").textContent =
      `${response.total || 0} booking${response.total === 1 ? "" : "s"}`;
    $("page-label").textContent = `Page ${state.page} of ${state.pages}`;
    $("prev-page").disabled = state.page <= 1;
    $("next-page").disabled = state.page >= state.pages;
  }

  async function refresh() {
    setFeedback("");
    $("refresh-btn").disabled = true;
    try {
      await Promise.all([loadSummary(), loadBookings()]);
      $("last-updated").textContent =
        `Updated ${new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    } catch (error) {
      if (/session has expired|administrator access/i.test(error.message)) {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        showLogin(error.message);
      } else setFeedback(error.message);
    } finally {
      $("refresh-btn").disabled = false;
    }
  }

  async function loadPackagesForOfflineForm() {
    if (state.packages.length) return;
    $("offline-package").innerHTML =
      '<option value="">Loading packages…</option>';
    const response = await api("/packages");
    state.packages = response.data?.packages || [];
    $("offline-package").innerHTML =
      '<option value="">Select photography package</option>';
    state.packages.forEach((pkg) => {
      const option = document.createElement("option");
      option.value = pkg._id;
      option.textContent = `${pkg.name} — ${money(pkg.price)}`;
      $("offline-package").append(option);
    });
  }

  function setOfflineTravelStatus(type, message) {
    const el = $("offline-travel-status");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("is-free", "is-chargeable", "is-unavailable");
    if (type) el.classList.add(`is-${type}`);
  }

  function getEffectiveOfflineTravel() {
    const rawManual = String($("offline-travel-charge")?.value ?? "").trim();
    if (rawManual !== "") {
      const parsed = Number(rawManual);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return { amount: parsed, isManual: true };
      }
    }
    if (state.offlineTravel?.available) {
      return { amount: Number(state.offlineTravel.travelCharge || 0), isManual: false };
    }
    return { amount: 0, isManual: false };
  }

  function updateOfflinePricePreview() {
    const pkg = state.packages.find(
      (item) => item._id === $("offline-package").value,
    );
    const { amount: travelCharge, isManual } = getEffectiveOfflineTravel();
    const travelPreviewEl = $("offline-travel-preview");
    if (travelPreviewEl) {
      if (!isManual && state.offlineTravel && !state.offlineTravel.available) {
        travelPreviewEl.textContent = "Outside range";
      } else {
        travelPreviewEl.textContent = money(travelCharge);
      }
    }

    if (!pkg) {
      $("offline-package-price").textContent = "—";
      $("offline-initial-payment-amount").textContent = "—";
      $("offline-balance-due").textContent = "—";
      return;
    }
    const basePrice = Number(pkg.price) || 0;
    const totalPrice = basePrice + travelCharge;
    const advance = Math.round((totalPrice * 0.2 + Number.EPSILON) * 100) / 100;
    const paymentChoice = $("offline-payment-choice").value || "advance";
    const initialPaymentAmount = paymentChoice === "full" ? totalPrice : advance;
    $("offline-package-price").textContent = money(basePrice);
    $("offline-initial-payment-label").textContent =
      paymentChoice === "full"
        ? "Full payment received now"
        : "20% advance received now";
    $("offline-initial-payment-amount").textContent =
      money(initialPaymentAmount);
    $("offline-balance-due").textContent = money(
      Math.max(totalPrice - initialPaymentAmount, 0),
    );
  }

  function scheduleOfflineLocationCheck() {
    clearTimeout(offlineTravelTimer);
    const pinCode = String($("offline-pincode")?.value || "").trim();
    if (!/^[1-9][0-9]{5}$/.test(pinCode)) {
      state.offlineTravel = null;
      setOfflineTravelStatus(
        "",
        "Enter a 6-digit PIN code to auto-calculate travel cost (free up to 25 km, ₹12.50/km each way beyond 25 km).",
      );
      updateOfflinePricePreview();
      return;
    }

    offlineTravelTimer = window.setTimeout(async () => {
      const seq = ++offlineTravelSeq;
      setOfflineTravelStatus("", "Checking travel distance for this location…");
      try {
        const response = await fetch(`${API}/bookings/check-location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pinCode,
            locality: String($("offline-locality")?.value || "").trim(),
            district: String($("offline-district")?.value || "").trim(),
            state: String($("offline-state")?.value || "").trim(),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (seq !== offlineTravelSeq) return;
        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Unable to verify location.");
        }
        state.offlineTravel = payload.data;
        if (!payload.data.available) {
          setOfflineTravelStatus(
            "unavailable",
            `${payload.data.message} Enter a manual travel cost below if you want to override for an offline booking.`,
          );
        } else if (payload.data.tier === "free") {
          setOfflineTravelStatus("free", payload.data.message);
        } else {
          setOfflineTravelStatus("chargeable", payload.data.message);
        }
      } catch (error) {
        if (seq !== offlineTravelSeq) return;
        state.offlineTravel = null;
        setOfflineTravelStatus("unavailable", error.message);
      } finally {
        updateOfflinePricePreview();
      }
    }, 450);
  }

  function closeOfflineModal() {
    clearTimeout(offlineTravelTimer);
    state.offlineTravel = null;
    $("offline-booking-modal").hidden = true;
    $("offline-booking-form").reset();
    setFeedback("", "offline-booking-feedback");
    setOfflineTravelStatus(
      "",
      "Enter a 6-digit PIN code to auto-calculate travel cost (free up to 25 km, ₹12.50/km each way beyond 25 km).",
    );
    updateOfflinePricePreview();
  }

  async function openOfflineModal() {
    clearTimeout(offlineTravelTimer);
    state.offlineTravel = null;
    setFeedback("", "offline-booking-feedback");
    $("offline-booking-form").reset();
    $("offline-event-date").min = todayIndia();
    $("offline-payment-choice").value = "advance";
    setOfflineTravelStatus(
      "",
      "Enter a 6-digit PIN code to auto-calculate travel cost (free up to 25 km, ₹12.50/km each way beyond 25 km).",
    );
    $("offline-booking-modal").hidden = false;
    try {
      await loadPackagesForOfflineForm();
      updateOfflinePricePreview();
      $("offline-customer-name").focus();
    } catch (error) {
      setFeedback(error.message, "offline-booking-feedback");
    }
  }

  function openPaymentModal(booking) {
    const due = outstandingBalance(booking);
    $("record-payment-form").reset();
    $("payment-booking-id").value = booking._id;
    $("record-payment-amount").value = due.toFixed(2);
    $("record-payment-amount").max = due.toFixed(2);
    $("payment-modal-context").textContent =
      `${(booking.user || booking.clientDetails || {}).name || "Customer"} · Remaining balance ${money(due)}`;
    setFeedback("", "record-payment-feedback");
    $("payment-modal").hidden = false;
    $("record-payment-amount").focus();
  }

  function closePaymentModal() {
    $("payment-modal").hidden = true;
    $("record-payment-form").reset();
    setFeedback("", "record-payment-feedback");
  }

  $("admin-login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    setFeedback("Signing in…", "login-feedback");
    try {
      const response = await fetch(`${API}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: $("admin-email").value.trim(),
          password: $("admin-password").value,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sign in failed.");
      if (data.data?.user?.role !== "admin")
        throw new Error(
          "This account is not an administrator. Ask the site owner to grant admin access.",
        );
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.data.user.role);
      localStorage.setItem("userName", data.data.user.name || "Administrator");
      showDashboard();
      await refresh();
    } catch (error) {
      setFeedback(error.message, "login-feedback");
    } finally {
      button.disabled = false;
    }
  });

  $("refresh-btn").addEventListener("click", refresh);
  $("logout-btn").addEventListener("click", () => {
    ["token", "userRole", "userName", "userEmail"].forEach((key) =>
      localStorage.removeItem(key),
    );
    $("admin-password").value = "";
    showLogin("You have been logged out.");
  });

  ["status-filter", "source-filter", "from-date", "to-date"].forEach((id) => {
    $(id).addEventListener("change", () => {
      state.page = 1;
      loadBookings().catch((error) => setFeedback(error.message));
    });
  });
  $("clear-filters").addEventListener("click", () => {
    $("status-filter").value = "";
    $("source-filter").value = "";
    $("from-date").value = "";
    $("to-date").value = "";
    $("search-input").value = "";
    state.page = 1;
    loadBookings().catch((error) => setFeedback(error.message));
  });
  $("search-input").addEventListener("input", () => {
    const term = $("search-input").value.trim().toLowerCase();
    const filtered = state.bookings.filter((booking) => {
      const client = booking.user || booking.clientDetails || {};
      const location = booking.eventLocation || {};
      const values = [
        client.name,
        client.email,
        client.phoneNumber,
        booking.package?.name,
        booking.bookingSource,
        location.venueName,
        location.addressLine,
        location.locality,
        location.district,
        location.state,
        location.pinCode,
        location.landmark,
      ];
      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    });
    renderBookings(filtered);
  });
  $("prev-page").addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      refresh();
    }
  });
  $("next-page").addEventListener("click", () => {
    if (state.page < state.pages) {
      state.page += 1;
      refresh();
    }
  });

  $("add-offline-booking-btn").addEventListener("click", openOfflineModal);
  $("close-offline-modal").addEventListener("click", closeOfflineModal);
  $("cancel-offline-booking").addEventListener("click", closeOfflineModal);
  $("offline-booking-modal").addEventListener("click", (event) => {
    if (event.target === $("offline-booking-modal")) closeOfflineModal();
  });
  $("offline-package").addEventListener("change", updateOfflinePricePreview);
  $("offline-payment-choice").addEventListener("change", updateOfflinePricePreview);
  $("offline-travel-charge")?.addEventListener("input", updateOfflinePricePreview);
  ["offline-pincode", "offline-locality", "offline-district", "offline-state"].forEach((id) => {
    $(id)?.addEventListener(id === "offline-state" ? "change" : "input", scheduleOfflineLocationCheck);
  });

  $("offline-booking-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const submitButton = $("save-offline-booking");
    submitButton.disabled = true;
    setFeedback(
      "Saving offline booking and reserving the date…",
      "offline-booking-feedback",
    );
    const formData = new FormData(event.currentTarget);
    const eventLocation = {
      venueName: String(formData.get("venueName") || "").trim(),
      addressLine: String(formData.get("addressLine") || "").trim(),
      locality: String(formData.get("locality") || "").trim(),
      district: String(formData.get("district") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      pinCode: String(formData.get("pinCode") || "").trim(),
      landmark: String(formData.get("landmark") || "").trim(),
      country: "India",
    };
    const payload = {
      customerName: String(formData.get("customerName") || "").trim(),
      phoneNumber: String(formData.get("phoneNumber") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      packageId: String(formData.get("packageId") || ""),
      eventDate: String(formData.get("eventDate") || ""),
      eventLocation,
      paymentMethod: String(formData.get("paymentMethod") || ""),
      paymentChoice: String(formData.get("paymentChoice") || "advance"),
      paymentReference: String(formData.get("paymentReference") || "").trim(),
      adminNotes: String(formData.get("adminNotes") || "").trim(),
      advancePolicyAccepted: formData.get("advancePolicyAccepted") === "on",
    };
    const rawTravelOverride = String(formData.get("travelCharge") ?? "").trim();
    if (rawTravelOverride !== "") {
      payload.travelCharge = Number(rawTravelOverride);
    }

    try {
      const response = await api("/bookings/admin/offline", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      closeOfflineModal();
      state.page = 1;
      await refresh();
      const emailNotice = response.receiptEmail?.sent
        ? ` A PDF receipt was emailed to ${response.receiptEmail.email}.`
        : response.receiptEmail?.reason === "no_customer_email"
          ? " No customer email was supplied, so no email receipt was sent."
          : response.receiptEmail
            ? " The booking was saved, but the receipt email could not be sent. Use Resend email PDF after checking SMTP settings."
            : "";
      const whatsappNotice = buildWhatsappNotice(
        response.receiptWhatsapp,
        payload.phoneNumber,
      );
      setFeedback(
        `${response.message || "Offline booking saved and the selected initial payment has been recorded."}${emailNotice}${whatsappNotice}`,
      );
    } catch (error) {
      setFeedback(error.message, "offline-booking-feedback");
    } finally {
      submitButton.disabled = false;
    }
  });

  $("close-payment-modal").addEventListener("click", closePaymentModal);
  $("cancel-record-payment").addEventListener("click", closePaymentModal);
  $("payment-modal").addEventListener("click", (event) => {
    if (event.target === $("payment-modal")) closePaymentModal();
  });
  $("record-payment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const submitButton = event.currentTarget.querySelector(
      'button[type="submit"]',
    );
    submitButton.disabled = true;
    setFeedback("Saving payment…", "record-payment-feedback");
    const formData = new FormData(event.currentTarget);
    const payload = {
      amount: Number(formData.get("amount")),
      paymentMethod: String(formData.get("paymentMethod") || ""),
      referenceId: String(formData.get("referenceId") || "").trim(),
      note: String(formData.get("note") || "").trim(),
    };
    try {
      const response = await api(
        `/bookings/admin/${encodeURIComponent($("payment-booking-id").value)}/payments`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      closePaymentModal();
      await refresh();
      const updatedBooking = response.data?.booking || {};
      const customerPhone =
        updatedBooking.clientDetails?.phoneNumber ||
        updatedBooking.user?.phoneNumber ||
        "";
      const emailNotice = response.receiptEmail?.sent
        ? ` Updated PDF receipt emailed to ${response.receiptEmail.email}.`
        : response.receiptEmail?.reason === "no_customer_email"
          ? " No customer email is recorded for this booking."
          : response.receiptEmail
            ? " Payment was saved, but email delivery failed. You can retry from the booking row."
            : "";
      const whatsappNotice = buildWhatsappNotice(
        response.receiptWhatsapp,
        customerPhone,
      );
      setFeedback(
        `Payment recorded successfully. The outstanding balance has been updated.${emailNotice}${whatsappNotice}`,
      );
    } catch (error) {
      setFeedback(error.message, "record-payment-feedback");
    } finally {
      submitButton.disabled = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!$("offline-booking-modal").hidden) closeOfflineModal();
      if (!$("payment-modal").hidden) closePaymentModal();
    }
  });

  if (token() && localStorage.getItem("userRole") === "admin") {
    showDashboard();
    refresh();
  } else showLogin();
})();