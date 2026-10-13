FROM aquasec/trivy:0.73.0 AS scanner
FROM rbpo-sast
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates python3-venv \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/conan \
    && /opt/conan/bin/pip install --no-cache-dir conan==2.21.0
COPY --from=scanner /usr/local/bin/trivy /usr/local/bin/trivy
ENV PATH="/opt/conan/bin:${PATH}"
ENV CONAN_HOME=/work/.conan-cache
ENV TRIVY_CACHE_DIR=/work/.trivy-cache
WORKDIR /work
CMD ["/bin/bash"]
