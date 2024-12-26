// "Use strict";

function handleDelete(postId) {
  if (!confirm("Are you sure you want to delete this post?")) {
    return; // Stop if user cancels
  }

  // Send a POST request to the server to delete the post
  fetch(`/posts/${postId}/delete`, {
    method: "POST",
  })
    .then((response) => response.json()) // Convert response to JSON
    .then((data) => {
      if (data.success) {
        // If deletion was successful, reload the manage posts page
        window.location.href = "/manage-posts";
      } else {
        // If deletion failed, log error or show notification
        console.error("Failed to delete post:", data.message);
        alert("Failed to delete post. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error deleting post:", error);
      alert("Error deleting post. Please try again.");
    });
}

const form = document.getElementById("postForm");
const options = {
  placeholder: "Tell your story...", // Placeholder text for the editor
  modules: {
    toolbar: "#toolbar-container",
  },
  theme: "bubble",
};
const titleInput = document.getElementById("title");
const publishButton = document.getElementById("publishButton");

function toggleSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.style.display =
    searchInput.style.display === "none" || searchInput.style.display === ""
      ? "block"
      : "none";
}

function toggleMenu() {
  const navItems = document.querySelector(".nav-items");
  const hamburger = document.querySelector(".hamburger-menu");
  navItems.style.display =
    navItems.style.display === "none" || navItems.style.display === ""
      ? "flex"
      : "none";
  hamburger.classList.toggle("active");
}

document.addEventListener("DOMContentLoaded", () => {
  // snippet to hide the search input on create and edit post pages
  const path = window.location.pathname;
  if (
    path.includes("/edit") ||
    path.includes("/new") ||
    path.includes("/review")
  ) {
    const searchContainer = document.querySelector(".nav-search-container");
    if (searchContainer) {
      searchContainer.style.display = "none";
      // If hiding search container disrupts layout, adjust nav-items style here
      const navItems = document.querySelector(".nav-items");
      if (navItems) {
        // Apply any necessary style changes to correct the layout
        navItems.style.alignItems = "center";
        navItems.style.justifyContent = "flex-end";
      }
    }
  }

  if (document.querySelector("#editor")) {
    console.log("Initializing Quill...");
    const quill = new Quill("#editor", options);

    function togglePublishButton() {
      // Check if title has content and Quill editor has content
      const titleHasContent = titleInput.value.trim().length > 0;
      const editorHasContent = quill.getText().trim().length > 0;
      publishButton.disabled = !(titleHasContent && editorHasContent);
      publishButton.style.opacity =
        titleHasContent && editorHasContent ? 1 : 0.3;
    }

    // Event listener for title input field
    if (titleInput) {
      titleInput.addEventListener("input", togglePublishButton);
    }
    quill.on("text-change", () => {
      if (quill.root.innerHTML === "<p><br></p>") {
        quill.root.innerHTML = "";
      }
      togglePublishButton();
    });

    // Initial content loading
    const initialContent = document
      .querySelector("#editor")
      .getAttribute("data-initial-content");
    quill.root.innerHTML = initialContent.trim() ? initialContent : "";
    togglePublishButton();

    if (publishButton) {
      console.log("Publish button is correctly selected.");

      publishButton.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent the default form submission behavior
        console.log("Publish button clicked.");
        // Setup form submission to include Quill's content in the 'postBody' hidden input
        const hiddenTextarea = document.getElementById("postBody");
        hiddenTextarea.value = quill.root.innerHTML;

        const form = document.getElementById("postForm");
        const formData = new FormData(form);

        for (var pair of formData.entries()) {
          console.log(pair[0] + ", " + pair[1]);
        }
        fetch(form.action, {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Server response:", data);
            showNotification(data.message, "/");
          })
          .catch((error) => {
            console.error("Error submitting form:", error);
            showNotification(
              "There was an error submitting your post. Please try again.",
              ""
            );
          });
      });
    }

    function showNotification(message, redirectUrl) {
      const notification = document.getElementById("autosaveNotification");
      const messageElement = document.getElementById("notificationMessage");

      console.log("Notification element:", notification); // Debug log
      console.log("Message element:", messageElement); // Debug log

      if (notification && messageElement) {
        messageElement.textContent = message;
        notification.style.display = "block";
        setTimeout(() => {
          notification.style.display = "none"; // hide the notification after the timing
          window.location.href = redirectUrl; // Perform the redirect
        }, 10000); // Adjust the timing as needed
      }
    }
    // Dynamically handle the 'Delete' button
    const pathSegments = window.location.pathname.split("/");
    // Checks if the current page is the 'Edit Post' page by looking for 'edit' in the URL path
    const isReviewPage = pathSegments.includes("review");
    // Extracts the post ID from the URL assuming the structure is /posts/{id}/edit
    const postId = isReviewPage
      ? pathSegments[pathSegments.indexOf("review") - 1]
      : null;

    // Only add the 'Delete' button on the 'Edit Post' page
    if (isReviewPage && postId) {
      const navbar = document.querySelector("header.navbar");
      // Create a container for both buttons
      const buttonGroup = document.createElement("div");
      buttonGroup.className = "button-group";

      // Get the publish button if it exists
      const publishButton = document.getElementById("publishButton");

      // Append the button group to the navbar

      if (navbar) {
        // Ensure the navbar exists
        const deleteForm = document.createElement("form");
        deleteForm.action = `/posts/${postId}/delete`;
        deleteForm.method = "POST";
        deleteForm.style.display = "contents";

        const deleteButton = document.createElement("button");
        deleteButton.type = "submit";
        deleteButton.id = "deleteButton";
        deleteButton.classList.add("pb"); // Add any required classes
        deleteButton.style.backgroundColor = "red";
        deleteButton.style.opacity = 1;

        // Create a span to hold the button text
        const buttonText = document.createElement("span");
        buttonText.className = "button-text";
        buttonText.textContent = "Delete";

        // Create an icon element for the trash icon
        const icon = document.createElement("i");
        icon.className = "fa-regular fa-trash-can"; //

        // Append the icon and text span to the delete button
        deleteButton.appendChild(icon);
        deleteButton.appendChild(buttonText);

        deleteButton.setAttribute("data-post-id", postId);

        deleteForm.appendChild(deleteButton);
        navbar.appendChild(deleteForm);
        // Append both buttons to the button group
        if (publishButton) {
          buttonGroup.appendChild(publishButton);
        }
        buttonGroup.appendChild(deleteButton);

        navbar.appendChild(buttonGroup);

        deleteButton.addEventListener("click", function (event) {
          event.preventDefault(); // Prevent the default form submission

          const confirmDelete = confirm(
            "Are you sure you want to delete this post?"
          );
          if (confirmDelete) {
            // Proceed with deletion
            const postId = this.getAttribute("data-post-id"); // Ensure this data attribute is set correctly on your delete button

            fetch(`/posts/${postId}/delete`, {
              method: "POST",
            })
              .then((response) => response.json()) // Parse JSON response
              .then((data) => {
                showNotification(data.message, "/manage-posts");
              })
              .catch((error) => {
                console.error("Error deleting post:", error);
                showNotification(
                  "An error occurred. Please try again.",
                  "/manage-posts"
                );
              });
          }
        });
      } else {
        console.error("Navbar not found");
      }

      // New Code: Dynamically set the publish form's action for the current post being edited
      const publishForm = document.getElementById("publishForm");
      if (publishForm && postId) {
        publishForm.action = `/posts/${postId}/publish`;
      }

      // Existing AJAX form submission code for the 'Publish' button
      // const externalButton = document.getElementById("publishButton"); // The button in the navbar

      // const notificationElement = document.getElementById("autosaveNotification"); // Ensure this element exists in your HTML

      // function hideNotification() {
      //   notificationElement.style.display = "none"; // Hide the notification
      // }

      // let autosaveTimeout;
      // quill.on("text-change", () => {
      //   clearTimeout(autosaveTimeout);
      //   hideNotification(); // Hide notification when user starts typing

      //   autosaveTimeout = setTimeout(() => {
      //     const postContent = quill.root.innerHTML;
      //     // Check if the editor content is not just empty or whitespace
      //     if (postContent.trim() !== "" && postContent !== "<p><br></p>") {
      //       fetch("/autosave", {
      //         method: "POST",
      //         headers: { "Content-Type": "application/json" },
      //         body: JSON.stringify({ content: postContent }),
      //       })
      //         .then((response) => response.json())
      //         .then((data) => {
      //           showNotification(data.message); // Show autosave confirmation
      //         })
      //         .catch((error) => console.error("Autosave error:", error));
      //     }
      //   }, 2000); // Autosave 2 seconds after the last change
      // });
    } else {
      console.log("Quill editor not found. Skipping Quill initialization.");
    }

    // window.addEventListener("beforeunload", function (e) {
    //   if (quill.getText().trim().length > 0) {
    //     const data = JSON.stringify({ draftId: "your_draft_id" });
    //     navigator.sendBeacon("/delete-draft", data);
    //   }
    // });
  }
});
