const scrollableColumn = document.getElementById('scrollable-column');
const loader = document.getElementById('loader');

// Simulate profiles (you can replace this with API data)
let profileCount = 2;

function loadProfiles() {
    for (let i = 0; i < 5; i++) {
        profileCount++;

        const profileCard = document.createElement('div');
        profileCard.className = 'profile-card';

        profileCard.innerHTML = `
            <div class="profile-photo">
                <img src="https://via.placeholder.com/60" alt="Profile ${profileCount}">
            </div>
            <div class="profile-info">
                <h3>Profile ${profileCount}</h3>
                <p>Description for profile ${profileCount}</p>
            </div>
        `;

        // Insert before the loader
        scrollableColumn.insertBefore(profileCard, loader);
    }
}

// Infinite scroll handler
scrollableColumn.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollableColumn;

    if (scrollTop + clientHeight >= scrollHeight - 5) {
        loader.style.display = 'block';

        setTimeout(() => {
            loadProfiles();
            loader.style.display = 'none';
        }, 1000); // Simulate loading delay
    }
});