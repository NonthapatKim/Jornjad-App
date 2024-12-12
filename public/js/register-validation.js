$(document).ready(function() {
  const form = $("form");
  const inputs = $("input");

  const showError = (input, message) => {
    const errorId = `error${capitalize(input.name)}`;
    const errorElement = $("#" + errorId);

    if (errorElement.length) {
      errorElement.text(message);
    }

    input.parentElement.classList.remove("outline-gray-300");
    input.parentElement.classList.add("outline-red-600");
  };

  const clearErrors = () => {
    inputs.each((_, input) => {
      const errorId = `error${capitalize(input.name)}`;
      const errorElement = $("#" + errorId);

      if (errorElement.length) {
        errorElement.text("");
      }

      input.parentElement.classList.remove("outline-red-600");
      input.parentElement.classList.add("outline-gray-300");
    });
  };

  const validateField = (input) => {
    const name = input.name;
    const value = input.value.trim();

    if (!value) {
      showError(input, `กรุณากรอกข้อมูล`);
      return false;
    }

    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError(input, "รูปแบบอีเมลไม่ถูกต้อง");
      return false;
    }

    if (name === "phonenumber" && !/^0[0-9]{9}$/.test(value)) {
      showError(input, "รูปแบบเบอร์โทรไม่ถูกต้อง (0XX-XXXXXXX)");
      return false;
    }

    if (name === "password" && value.length < 8) {
      showError(input, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return false;
    }

    if (name === "confirmpassword") {
      const password = form.find("input[name='password']").val();
      if (value !== password) {
        showError(input, "รหัสผ่านไม่ตรงกัน");
        return false;
      }
    }

    return true;
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  form.on("submit", function(event) {
    event.preventDefault(); // ป้องกันการส่งฟอร์มปกติ

    clearErrors();
    let isValid = true;

    // ตรวจสอบความถูกต้องของข้อมูลทุกฟิลด์
    inputs.each((_, input) => {
      const isFieldValid = validateField(input);
      if (!isFieldValid) isValid = false;
    });

    if (isValid) {
      $.ajax({
        url: form.attr("action"),
        method: "POST",
        data: form.serialize(), 
        success: function(response) {
          if (response.message === "Registration successful") {
            alert("ลงทะเบียนสำเร็จ !");
            window.location.href = '/login';
          }
        },
        error: function(xhr, status, error) {
          const errorText = xhr.responseText || "เกิดข้อผิดพลาดขณะส่งข้อมูล กรุณาลองใหม่อีกครั้ง";
          $("#error-text").text(errorText);
          $("#error-message").removeClass("hidden");
        }
      });
    }
  });

  inputs.each((_, input) => {
    $(input).on("blur", function() {
      clearErrors();
      validateField(input);
    });
  });
});
