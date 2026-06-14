/* =========================================================
   PayruExchange — KYC verification page
   ========================================================= */

const ID_PLACEHOLDERS = {
  nin: { label: "NIN Number", placeholder: "Enter your 11-digit National ID Number" },
  voters_card: { label: "Voter's Card Number (VIN)", placeholder: "Enter your Voter's Identification Number" },
  drivers_license: { label: "Driver's License Number", placeholder: "Enter your Driver's License number" },
  passport: { label: "International Passport Number", placeholder: "Enter your passport number" },
};

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  const flash = PayruDB.consumeFlash();
  if (flash) showToast(flash.message, flash.type);

  const formWrap = document.getElementById("kycFormWrap");
  const pendingWrap = document.getElementById("kycPendingWrap");

  if (user.kyc.status === "verified") {
    window.location.href = "dashboard.html";
    return;
  }

  if (user.kyc.status === "pending") {
    formWrap.style.display = "none";
    pendingWrap.style.display = "block";
    return;
  }

  formWrap.style.display = "block";
  pendingWrap.style.display = "none";

  if (user.kyc.status === "rejected") {
    document.getElementById("rejectedBanner").style.display = "flex";
  }

  const idTypeSelect = document.getElementById("idType");
  const idNumberLabel = document.getElementById("idNumberLabel");
  const idNumberInput = document.getElementById("idNumber");

  idTypeSelect.addEventListener("change", () => {
    const info = ID_PLACEHOLDERS[idTypeSelect.value];
    if (info) {
      idNumberLabel.textContent = info.label;
      idNumberInput.placeholder = info.placeholder;
    }
  });

  // ----- Document upload (front & back) -----
  let documentImage = null;
  let documentImageBack = null;

  function setupFileDrop(dropId, inputId, previewId, textId, onLoad) {
    const fileDrop = document.getElementById(dropId);
    const fileInput = document.getElementById(inputId);
    const filePreview = document.getElementById(previewId);
    const fileDropText = document.getElementById(textId);

    function handleFile(file) {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please upload an image file (PNG or JPG).", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("File is too large. Please upload an image under 5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onLoad(reader.result);
        filePreview.src = reader.result;
        filePreview.style.display = "block";
        fileDropText.innerHTML = `<strong>${file.name}</strong><span>Click to choose a different file</span>`;
        fileDrop.classList.add("has-preview");
      };
      reader.readAsDataURL(file);
    }

    fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

    fileDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileDrop.classList.add("dragover");
    });
    fileDrop.addEventListener("dragleave", () => fileDrop.classList.remove("dragover"));
    fileDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      fileDrop.classList.remove("dragover");
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  setupFileDrop("fileDrop", "documentImage", "documentPreview", "fileDropText", (result) => { documentImage = result; });
  setupFileDrop("fileDropBack", "documentImageBack", "documentPreviewBack", "fileDropTextBack", (result) => { documentImageBack = result; });

  const form = document.getElementById("kycForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const idType = idTypeSelect.value;
    const idNumber = idNumberInput.value.trim();
    const dob = document.getElementById("dob").value;
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value;
    const country = document.getElementById("country").value;

    if (!idType || !idNumber || !dob || !address || !city || !state) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (!documentImage) {
      showToast("Please upload a photo of the front of your identity document.", "error");
      return;
    }

    if (!documentImageBack) {
      showToast("Please upload a photo of the back of your identity document.", "error");
      return;
    }

    PayruDB.submitKYC(user.id, { idType, idNumber, dob, address, city, state, country, documentImage, documentImageBack });
    PayruDB.setFlash("Your KYC information has been submitted and is under review.", "success");
    window.location.href = "dashboard.html";
  });
});
