$(document).ready(function () {
  const form = $("form");
  const inputs = form.find("input");

  const showError = (input, message) => {
    const errorId = `error${capitalize(input.name)}`;
    const errorElement = $(`#${errorId}`);

    if (errorElement.length) {
      errorElement.text(message);
    }

    $(input).removeClass("outline-gray-300").addClass("outline-red-600");
  };

  const clearErrors = () => {
    inputs.each(function () {
      const input = $(this);
      const errorId = `error${capitalize(input.attr("name"))}`;
      const errorElement = $(`#${errorId}`);

      if (errorElement.length) {
        errorElement.text("");
      }

      input.removeClass("outline-red-600").addClass("outline-gray-300");
    });
  };

  const validateField = (input) => {
    const name = input.name;
    const value = input.value.trim();

    if (!value) {
      showError(input, `กรุณากรอกข้อมูล`);
      return false;
    }

    if (name === "username") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          showError(input, "รูปแบบอีเมลไม่ถูกต้อง");
          return false;
        }
      } else {
        if (value.length < 3) {
          showError(input, "ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร");
          return false;
        }
      }
    }

    if (name === "password" && value.length < 8) {
      showError(input, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return false;
    }

    return true;
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  form.on("submit", function (event) {
    event.preventDefault();
    clearErrors();
    let isValid = true;

    inputs.each(function () {
      const input = $(this);
      const isFieldValid = validateField(this);
      if (!isFieldValid) isValid = false;
    });

    if (!isValid) {
      return; // ไม่ให้ส่งฟอร์มหากข้อมูลไม่ถูกต้อง
    }

    // ส่งข้อมูลฟอร์มผ่าน Ajax
    const formData = form.serialize();

    $.ajax({
      url: form.attr("action"),  // URL ที่ส่งข้อมูลไป
      method: "POST",
      data: formData,
      success: function (response) {        
        if (response === "Login successful") {
          alert("เข้าสู่ระบบสำเร็จ !");
          window.location.href = '/home';
        }
      },
      error: function (xhr, status, error) {
        const errorText = xhr.responseText || "เกิดข้อผิดพลาดขณะส่งข้อมูล กรุณาลองใหม่อีกครั้ง";
        $("#error-text").text(errorText);
        $("#error-message").removeClass("hidden");
      }
    });
  });

  inputs.each(function () {
    $(this).on("blur", function () {
      clearErrors();
      validateField(this);
    });
  });
});





