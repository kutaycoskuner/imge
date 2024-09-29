<template>
    <div class="cv-container">
        <page size="A4">
            <div class="cv-content">
                <h1>John Doe</h1>
                <h2>Software Developer</h2>

                <section>
                    <h3>Professional Summary</h3>
                    <p>Experienced software developer with expertise in Vue.js, JavaScript, and responsive web design.
                        Passionate about creating efficient and user-friendly applications.</p>
                </section>

                <section>
                    <h3>Work Experience</h3>
                    <div class="job">
                        <h4>Senior Developer - Tech Co.</h4>
                        <p class="date">2018 - Present</p>
                        <ul>
                            <li>Led development of company's flagship product</li>
                            <li>Mentored junior developers and conducted code reviews</li>
                            <li>Implemented new features resulting in 20% user growth</li>
                        </ul>
                    </div>
                    <div class="job">
                        <h4>Web Developer - Digital Agency</h4>
                        <p class="date">2015 - 2018</p>
                        <ul>
                            <li>Developed responsive websites for various clients</li>
                            <li>Collaborated with design team to implement UI/UX improvements</li>
                            <li>Optimized site performance, reducing load times by 40%</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h3>Education</h3>
                    <p><strong>Bachelor of Science in Computer Science</strong></p>
                    <p>University of Technology, Graduated 2015</p>
                </section>
            </div>
        </page>
    </div>
</template>

<style scoped>
body {
    margin: 0;
    padding: 0;
}

.cv-container {
    background: white;
    display: block;
    margin: 0 auto;
    margin-bottom: 0.5cm;
    box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.5);
}

page {
    background: whitesmoke;
    display: block;
    margin: 0 auto;
    box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.5);
}

page[size="A4"] {
    width: 21cm;
    height: 29.7cm;
}

.cv-content {
    padding: 2cm;
}

h1,
h2,
h3,
h4 {
    margin-top: 0;
}

section {
    margin-bottom: 1cm;
}

.job {
    margin-bottom: 0.5cm;
}

.date {
    font-style: italic;
}

@media print {

    body,
    .cv-container,
    page {
        margin: 0;
        box-shadow: none;
    }

    .cv-container {
        width: 21cm;
        height: 29.7cm;
        page-break-after: always;
    }
}
</style>