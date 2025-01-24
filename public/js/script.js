gsap.from(".nav-container", 2, {y: -60, opacity: 0, ease: "power3.inOut", delay: 0.5});
gsap.from(".hero > *", 1, {y: 60, opacity: 0, ease: "power3.inOut", delay: 1, stagger:{amount: 0.5}});
gsap.from(".blob", 2, {scale:0,  ease: "power3.inOut", delay: 1.5, stagger:{amount: 0.5}});
gsap.from(".bg-gradient", 1, {scale:0, ease: "power3.inOut", delay: 2,});
 